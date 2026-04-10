import fs from "node:fs";
import path from "node:path";
import { validateTelegramConfig, validateWechatConfig } from "../config.js";
import {
  sendWechatMessage,
  formatWechatMessage,
  sendWechatMarkdownMessage,
} from "./wechat.js";
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
  validateTelegramConfig();

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
 * Send notification via all configured channels (Telegram and/or WeChat)
 * @param {object} config - Configuration object
 * @param {string} text - Message text
 * @param {array} attachments - Optional file paths
 */
export async function sendNotification(config, text, attachments = []) {
  const errors = [];

  // Try Telegram if configured
  if (config.telegramBotToken && config.telegramChatId) {
    try {
      await sendTelegramMessage(config, text, attachments);
      console.log("✓ Message sent via Telegram");
    } catch (err) {
      console.error("✗ Telegram notification failed:", err.message);
      errors.push(`Telegram: ${err.message}`);
    }
  }

  // Try WeChat if configured
  if (config.wechatWebhookUrl) {
    try {
      await sendWechatMessage(config, text, attachments);
      console.log("✓ Message sent via WeChat");
    } catch (err) {
      console.error("✗ WeChat notification failed:", err.message);
      errors.push(`WeChat: ${err.message}`);
    }
  }

  // If no notification channel is configured
  if (!config.telegramBotToken && !config.wechatWebhookUrl) {
    throw new Error(
      "No notification channel configured. Set TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID or WECHAT_WEBHOOK_URL in .env",
    );
  }

  // If all channels failed
  if (
    errors.length > 0 &&
    errors.length ===
      (config.telegramBotToken ? 1 : 0) + (config.wechatWebhookUrl ? 1 : 0)
  ) {
    throw new Error(`All notification channels failed:\n${errors.join("\n")}`);
  }
}

/**
 * Determine which channels to use based on configuration
 * @param {object} config - Configuration object
 * @returns {object} Object with telegram and wechat boolean flags
 */
function getChannelsToUse(config) {
  const channels = config.notificationChannels || ["both"];
  const useTelegram =
    (channels.includes("telegram") || channels.includes("both")) &&
    config.telegramBotToken &&
    config.telegramChatId;
  const useWechat =
    (channels.includes("wechat") || channels.includes("both")) &&
    config.wechatWebhookUrl;

  return { useTelegram, useWechat };
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
  const { useTelegram, useWechat } = getChannelsToUse(config);

  // Check if at least one channel is available
  if (!useTelegram && !useWechat) {
    const configuredChannels = config.notificationChannels?.join(",") || "both";
    throw new Error(
      `No available notification channel for '${configuredChannels}'. ` +
        `Ensure TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID or WECHAT_WEBHOOK_URL are set in .env`,
    );
  }

  const telegramText = useTelegram ? formatTelegramMessage(message) : "";
  const wechatText = useWechat ? formatWechatMessage(message) : "";

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

  // If all channels failed
  if (
    errors.length > 0 &&
    errors.length === (useTelegram ? 1 : 0) + (useWechat ? 1 : 0)
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
