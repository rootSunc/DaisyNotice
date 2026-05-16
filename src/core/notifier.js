import fs from "node:fs";
import path from "node:path";
import { validateTelegramConfig } from "../config.js";
import {
  sendEmailMessage,
  formatEmailMessage,
  formatEmailSubject,
} from "./email.js";
import { sendWechatMessage, sendWechatMarkdownMessage } from "./wechat.js";

function chunkText(text, size = 3500) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > size) {
    chunks.push(remaining.slice(0, size));
    remaining = remaining.slice(size);
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

async function sendTelegramChunk(botToken, chatId, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}

export async function sendTelegramDocument(botToken, chatId, filePath) {
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append("chat_id", String(chatId));
  formData.append("document", blob, filename);

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendDocument`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram sendDocument failed: ${response.status} ${text}`);
  }
}

export async function sendTelegramMessage(config, text, attachments = []) {
  validateTelegramConfig(config);

  const parts = chunkText(text);
  for (const part of parts) {
    await sendTelegramChunk(
      config.telegramBotToken,
      config.telegramChatId,
      part,
    );
  }

  for (const filePath of attachments) {
    try {
      if (fs.existsSync(filePath)) {
        await sendTelegramDocument(
          config.telegramBotToken,
          config.telegramChatId,
          filePath,
        );
      }
    } catch (err) {
      console.error(`Failed to send attachment ${filePath}:`, err);
    }
  }
}

export function formatTelegramMessage(message) {
  const lines = [
    "📩 Pilke DaisyFamily New Message",
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

/**
 * Send notification via selected channels (Telegram, WeChat, and/or email)
 * @param {object} config - Configuration object
 * @param {string} text - Message text
 * @param {array} attachments - Optional file paths
 */
export async function sendNotification(config, text, attachments = []) {
  const { useTelegram, useWechat, useEmail } = getChannelsToUse(config);

  if (!useTelegram && !useWechat && !useEmail) {
    const configuredChannels = config.notificationChannels?.join(",") || "both";
    throw new Error(
      `No available notification channel for '${configuredChannels}'. ` +
        "Ensure the selected channel secrets are configured.",
    );
  }

  const errors = [];

  // Try Telegram if selected
  if (useTelegram) {
    try {
      await sendTelegramMessage(config, text, attachments);
      console.log("✓ Message sent via Telegram");
    } catch (err) {
      console.error("✗ Telegram notification failed:", err.message);
      errors.push(`Telegram: ${err.message}`);
    }
  }

  // Try WeChat if selected
  if (useWechat) {
    try {
      await sendWechatMessage(config, text, attachments);
      console.log("✓ Message sent via WeChat");
    } catch (err) {
      console.error("✗ WeChat notification failed:", err.message);
      errors.push(`WeChat: ${err.message}`);
    }
  }

  // Try email if selected
  if (useEmail) {
    try {
      await sendEmailMessage(config, text, attachments);
      console.log("✓ Message sent via email");
    } catch (err) {
      console.error("✗ Email notification failed:", err.message);
      errors.push(`Email: ${err.message}`);
    }
  }

  // If all channels failed
  if (
    errors.length > 0 &&
    errors.length ===
      (useTelegram ? 1 : 0) + (useWechat ? 1 : 0) + (useEmail ? 1 : 0)
  ) {
    throw new Error(`All notification channels failed:\n${errors.join("\n")}`);
  }
}

/**
 * Determine which channels to use based on configuration
 * @param {object} config - Configuration object
 * @returns {object} Object with telegram, wechat, and email boolean flags
 */
function getChannelsToUse(config) {
  const channels = config.notificationChannels?.length
    ? config.notificationChannels
    : ["both"];
  const useAll = channels.includes("all");
  const useBoth = channels.includes("both");
  const hasTelegramConfig = Boolean(
    config.telegramBotToken && config.telegramChatId,
  );
  const hasWechatConfig = Boolean(config.wechatWebhookUrl);
  const hasSmtpEmailConfig = Boolean(
    config.emailSmtpHost &&
      config.emailSmtpUser &&
      config.emailSmtpPass &&
      config.emailFrom &&
      config.emailTo?.length,
  );
  const hasWebhookEmailConfig = Boolean(
    config.emailWebhookUrl &&
      config.emailWebhookToken &&
      config.emailFrom &&
      config.emailTo?.length,
  );
  const hasEmailConfig = hasSmtpEmailConfig || hasWebhookEmailConfig;
  const useTelegram =
    (channels.includes("telegram") || useBoth || useAll) && hasTelegramConfig;
  const useWechat =
    (channels.includes("wechat") || useBoth || useAll) && hasWechatConfig;
  const useEmail =
    (channels.includes("email") || useAll) && hasEmailConfig;

  return { useTelegram, useWechat, useEmail };
}

/**
 * Format message and send via selected notification channels
 * @param {object} config - Configuration object
 * @param {object} message - Message object
 * @param {array} attachments - Optional file paths
 */
export async function sendFormattedNotification(
  config,
  message,
  attachments = [],
) {
  const { useTelegram, useWechat, useEmail } = getChannelsToUse(config);

  // Check if at least one channel is available
  if (!useTelegram && !useWechat && !useEmail) {
    const configuredChannels = config.notificationChannels?.join(",") || "both";
    throw new Error(
      `No available notification channel for '${configuredChannels}'. ` +
        "Ensure the selected channel secrets are configured.",
    );
  }

  const telegramText = useTelegram ? formatTelegramMessage(message) : "";
  const emailText = useEmail ? formatEmailMessage(message) : "";
  const emailSubject = useEmail ? formatEmailSubject(message) : "";

  const errors = [];

  // Send via Telegram if selected
  if (useTelegram) {
    try {
      await sendTelegramMessage(config, telegramText, attachments);
      console.log("✓ Message sent via Telegram");
    } catch (err) {
      console.error("✗ Telegram notification failed:", err.message);
      errors.push(`Telegram: ${err.message}`);
    }
  }

  // Send via WeChat if selected
  if (useWechat) {
    try {
      // Use markdown for WeChat for better formatting
      const wechatMarkdown = formatWechatMessageAsMarkdown(message);
      await sendWechatMarkdownMessage(config, wechatMarkdown);
      console.log("✓ Message sent via WeChat");
    } catch (err) {
      console.error("✗ WeChat notification failed:", err.message);
      errors.push(`WeChat: ${err.message}`);
    }
  }

  // Send via email if selected
  if (useEmail) {
    try {
      await sendEmailMessage(config, emailText, attachments, emailSubject);
      console.log("✓ Message sent via email");
    } catch (err) {
      console.error("✗ Email notification failed:", err.message);
      errors.push(`Email: ${err.message}`);
    }
  }

  // If all channels failed
  if (
    errors.length > 0 &&
    errors.length ===
      (useTelegram ? 1 : 0) + (useWechat ? 1 : 0) + (useEmail ? 1 : 0)
  ) {
    throw new Error(`All notification channels failed:\n${errors.join("\n")}`);
  }
}

/**
 * Format message as markdown for WeChat display
 * @param {object} message - Message object
 * @returns {string} Markdown formatted message
 */
export function formatWechatMessageAsMarkdown(message) {
  const lines = [
    "# 📩 Pilke DaisyFamily New Message",
    "",
    `**Title**: ${message.title || "(Untitled)"}`,
  ];

  if (message.sender) {
    lines.push(`**Sender**: ${message.sender}`);
  }

  lines.push(`**Time**: ${message.timestamp || "Unknown"}`);
  lines.push("");

  if (message.body) {
    lines.push(message.body);
    lines.push("");
  }

  lines.push(`message ID: ${message.id}`);

  return lines.join("\n");
}
