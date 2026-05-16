import fs from "node:fs";
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

export async function sendEmailMessage(
  config,
  text,
  attachments = [],
  subject = "DaisyNotice Notification",
) {
  validateEmailConfig(config);

  const transporter = nodemailer.createTransport({
    host: config.emailSmtpHost,
    port: config.emailSmtpPort,
    secure: config.emailSmtpSecure,
    auth: {
      user: config.emailSmtpUser,
      pass: config.emailSmtpPass,
    },
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
