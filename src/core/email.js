import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import nodemailer from "nodemailer";
import { validateEmailConfig } from "../config.js";

function getExistingAttachments(attachments) {
  return attachments
    .filter((filePath) => {
      if (fs.existsSync(filePath)) {
        return true;
      }

      console.warn(`Email attachment does not exist. Skipping: ${filePath}`);
      return false;
    })
    .map((filePath) => ({ path: filePath }));
}

function getWebhookAttachments(attachments) {
  return attachments
    .filter((filePath) => {
      if (fs.existsSync(filePath)) {
        return true;
      }

      console.warn(`Email attachment does not exist. Skipping: ${filePath}`);
      return false;
    })
    .map((filePath) => ({
      filename: path.basename(filePath),
      contentType: "application/octet-stream",
      contentBase64: fs.readFileSync(filePath).toString("base64"),
    }));
}

export function formatEmailSubject(message) {
  const title = message.title?.trim() || "New Message";
  return `[DaisyNotice] ${title}`.slice(0, 180);
}

export function formatEmailMessage(message) {
  const lines = [
    "Pilke DaisyFamily New Message",
    "",
    `Title: ${message.title || "(Untitled)"}`,
  ];

  if (message.sender) {
    lines.push(`Sender: ${message.sender}`);
  }

  lines.push(`Time: ${message.timestamp || "Unknown"}`);
  lines.push("");

  if (message.body) {
    lines.push(message.body);
    lines.push("");
  }

  lines.push(`Message ID: ${message.id}`);

  return lines.join("\n");
}

async function getTransportHost(config) {
  const host = config.emailSmtpHost;

  if (config.emailSmtpFamily !== 4 || net.isIP(host)) {
    return host;
  }

  const address = await dns.lookup(host, { family: 4 });
  if (!address?.address) {
    throw new Error(`No IPv4 address found for SMTP host: ${host}`);
  }

  return address.address;
}

function getTransportServername(config) {
  return net.isIP(config.emailSmtpHost) ? undefined : config.emailSmtpHost;
}

function getEmailProvider(config) {
  if (config.emailProvider === "webhook" || config.emailProvider === "smtp") {
    return config.emailProvider;
  }

  return config.emailWebhookUrl ? "webhook" : "smtp";
}

async function sendEmailViaWebhook(config, text, attachments, subject) {
  const response = await fetch(config.emailWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: config.emailWebhookToken,
      from: config.emailFrom,
      to: config.emailTo,
      subject,
      text,
      attachments: getWebhookAttachments(attachments),
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Email webhook failed: ${response.status} ${body}`);
  }

  if (body) {
    try {
      const data = JSON.parse(body);
      if (data.ok === false) {
        throw new Error(data.error || "Unknown email webhook error");
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      throw error;
    }
  }
}

async function sendEmailWithTransportConfig(config, text, attachments, subject) {
  const servername = getTransportServername(config);
  const host = await getTransportHost(config);

  const transporter = nodemailer.createTransport({
    host,
    port: config.emailSmtpPort,
    secure: config.emailSmtpSecure,
    servername,
    auth: {
      user: config.emailSmtpUser,
      pass: config.emailSmtpPass,
    },
    tls: servername ? { servername } : undefined,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
  });

  await transporter.sendMail({
    from: config.emailFrom,
    to: config.emailTo,
    subject,
    text,
    attachments: getExistingAttachments(attachments),
  });
}

function isConnectionTimeout(error) {
  return (
    error?.code === "ETIMEDOUT" ||
    error?.code === "ESOCKET" ||
    /connection timeout|timed out/i.test(error?.message || "")
  );
}

function getFallbackConfig(config, error) {
  if (
    !isConnectionTimeout(error) ||
    config.emailSmtpPort !== 465 ||
    !config.emailSmtpFallbackPort ||
    config.emailSmtpFallbackPort === config.emailSmtpPort
  ) {
    return null;
  }

  return {
    ...config,
    emailSmtpPort: config.emailSmtpFallbackPort,
    emailSmtpSecure: config.emailSmtpFallbackSecure,
  };
}

export async function sendEmailMessage(
  config,
  text,
  attachments = [],
  subject = "DaisyNotice Notification",
) {
  validateEmailConfig(config);

  const provider = getEmailProvider(config);
  console.log(`Email delivery provider: ${provider}`);

  if (provider === "webhook") {
    await sendEmailViaWebhook(config, text, attachments, subject);
    return;
  }

  try {
    await sendEmailWithTransportConfig(config, text, attachments, subject);
  } catch (error) {
    const fallbackConfig = getFallbackConfig(config, error);
    if (!fallbackConfig) {
      throw error;
    }

    console.warn(
      `Email SMTP connection to ${config.emailSmtpHost}:${config.emailSmtpPort} timed out. ` +
        `Retrying ${fallbackConfig.emailSmtpHost}:${fallbackConfig.emailSmtpPort}.`,
    );

    try {
      await sendEmailWithTransportConfig(
        fallbackConfig,
        text,
        attachments,
        subject,
      );
    } catch (fallbackError) {
      throw new Error(
        `Primary SMTP failed: ${error.message}; fallback SMTP failed: ${fallbackError.message}`,
      );
    }
  }
}
