/**
 * WeChat notification module
 * Supports Enterprise WeChat webhook API
 */

import { validateWechatConfig } from "../config.js";

function chunkText(text, size = 2000) {
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

/**
 * Send text message via Enterprise WeChat webhook
 * @param {string} webhookUrl - WeChat webhook URL
 * @param {string} text - Message text
 */
async function sendWechatChunk(webhookUrl, text) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msgtype: "text",
      text: {
        content: text,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WeChat sendMessage failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (data.errcode !== 0) {
    throw new Error(`WeChat API error: ${data.errcode} ${data.errmsg || ""}`);
  }
}

/**
 * Send markdown message via Enterprise WeChat webhook
 * Useful for formatted content with links
 * @param {string} webhookUrl - WeChat webhook URL
 * @param {string} markdown - Markdown formatted text
 */
async function sendWechatMarkdown(webhookUrl, markdown) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: {
        content: markdown,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WeChat sendMarkdown failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (data.errcode !== 0) {
    throw new Error(`WeChat API error: ${data.errcode} ${data.errmsg || ""}`);
  }
}

/**
 * Send message via Enterprise WeChat
 * @param {object} config - Configuration object with wechatWebhookUrl
 * @param {string} text - Message text
 * @param {array} attachments - Optional file paths (not supported by WeChat webhook)
 */
export async function sendWechatMessage(config, text, attachments = []) {
  validateWechatConfig();

  const parts = chunkText(text);
  for (const part of parts) {
    await sendWechatChunk(config.wechatWebhookUrl, part);
  }

  if (attachments.length > 0) {
    console.warn(
      "WeChat webhook API does not support file attachments. Skipping attachments.",
    );
  }
}

/**
 * Send markdown formatted message via WeChat
 * @param {object} config - Configuration object with wechatWebhookUrl
 * @param {string} markdown - Markdown formatted text
 */
export async function sendWechatMarkdownMessage(config, markdown) {
  validateWechatConfig();

  // For markdown, we don't chunk as it's typically shorter
  // But if needed, split by logical sections
  const parts = markdown.split("\n\n");
  let currentMessage = "";

  for (const part of parts) {
    if ((currentMessage + part).length > 2000) {
      if (currentMessage) {
        await sendWechatMarkdown(config.wechatWebhookUrl, currentMessage);
        currentMessage = part;
      } else {
        await sendWechatMarkdown(config.wechatWebhookUrl, part);
      }
    } else {
      currentMessage += (currentMessage ? "\n\n" : "") + part;
    }
  }

  if (currentMessage) {
    await sendWechatMarkdown(config.wechatWebhookUrl, currentMessage);
  }
}

/**
 * Format message for WeChat display
 * @param {object} message - Message object with title, sender, timestamp, body, id
 * @returns {string} Formatted message text
 */
export function formatWechatMessage(message) {
  const lines = [
    "📩 **Pilke DaisyFamily New Message**",
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

  lines.push(`**Message ID**: ${message.id}`);

  return lines.join("\n");
}
