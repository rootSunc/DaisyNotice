import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function parseSmtpFamily(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["0", "auto", "any"].includes(normalized)) {
    return 0;
  }
  if (normalized === "4") {
    return 4;
  }

  return fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseList(value, fallback) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEmailProvider(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["auto", "webhook", "smtp"].includes(normalized)) {
    return normalized;
  }

  return fallback;
}

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, "data");
const debugDir = path.join(dataDir, "debug");
const emailSmtpPort = parsePositiveInteger(
  process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT,
  465,
);
const emailSmtpFallbackPort = parsePositiveInteger(
  process.env.EMAIL_SMTP_FALLBACK_PORT || process.env.SMTP_FALLBACK_PORT,
  587,
);

export const config = {
  rootDir,
  dataDir,
  debugDir,
  sessionPath: path.join(dataDir, "session.json"),
  statePath: path.join(dataDir, "state.json"),
  baseUrl: process.env.PILKE_BASE_URL || "https://pilke.daisyfamily.fi/login",
  pilkeUsername: process.env.PILKE_USERNAME || "",
  pilkePassword: process.env.PILKE_PASSWORD || "",
  messagesUrl: process.env.MESSAGES_URL || "",
  pollIntervalHours: parsePositiveInteger(process.env.POLL_INTERVAL_HOURS, 8),
  initialSyncMode: process.env.INITIAL_SYNC_MODE || "mark-seen",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  wechatWebhookUrl: process.env.WECHAT_WEBHOOK_URL || "",
  emailWebhookUrl:
    process.env.EMAIL_WEBHOOK_URL || process.env.MAIL_WEBHOOK_URL || "",
  emailWebhookToken:
    process.env.EMAIL_WEBHOOK_TOKEN || process.env.MAIL_WEBHOOK_TOKEN || "",
  emailProvider: parseEmailProvider(process.env.EMAIL_PROVIDER, "auto"),
  emailSmtpHost: process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || "",
  emailSmtpPort,
  emailSmtpSecure: parseBoolean(
    process.env.EMAIL_SMTP_SECURE || process.env.SMTP_SECURE,
    emailSmtpPort === 465,
  ),
  emailSmtpFallbackPort,
  emailSmtpFallbackSecure: parseBoolean(
    process.env.EMAIL_SMTP_FALLBACK_SECURE || process.env.SMTP_FALLBACK_SECURE,
    emailSmtpFallbackPort === 465,
  ),
  emailSmtpFamily: parseSmtpFamily(
    process.env.EMAIL_SMTP_FAMILY || process.env.SMTP_FAMILY,
    4,
  ),
  emailSmtpUser: process.env.EMAIL_SMTP_USER || process.env.SMTP_USER || "",
  emailSmtpPass: process.env.EMAIL_SMTP_PASS || process.env.SMTP_PASS || "",
  emailFrom:
    process.env.EMAIL_FROM ||
    process.env.MAIL_FROM ||
    process.env.EMAIL_SMTP_USER ||
    process.env.SMTP_USER ||
    "",
  emailTo: parseList(process.env.EMAIL_TO || process.env.MAIL_TO, []),
  selectors: {
    row: process.env.MESSAGE_ROW_SELECTOR || "",
    title: process.env.MESSAGE_TITLE_SELECTOR || "",
    body: process.env.MESSAGE_BODY_SELECTOR || "",
    date: process.env.MESSAGE_DATE_SELECTOR || "",
  },
  messagesNavLabels: parseList(process.env.MESSAGES_NAV_LABELS, [
    "Viestit",
    "Messages",
    "Inbox",
  ]),
  notificationChannels: (process.env.NOTIFICATION_CHANNELS || "telegram")
    .toLowerCase()
    .split(",")
    .map((ch) => ch.trim())
    .filter((ch) =>
      ["telegram", "wechat", "email", "both", "all"].includes(ch),
    ),
  debugCapture: process.env.DEBUG_CAPTURE === "1",
};

export function ensureDataDirectories() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.debugDir, { recursive: true });
}

export function validateTelegramConfig(targetConfig = config) {
  if (!targetConfig.telegramBotToken || !targetConfig.telegramChatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
  }
}

export function validateWechatConfig(targetConfig = config) {
  if (!targetConfig.wechatWebhookUrl) {
    throw new Error("Missing WECHAT_WEBHOOK_URL in .env");
  }
}

export function validateEmailConfig(targetConfig = config) {
  const missing = [];
  const useWebhook =
    targetConfig.emailProvider === "webhook" ||
    (targetConfig.emailProvider === "auto" && targetConfig.emailWebhookUrl);
  const useSmtp =
    targetConfig.emailProvider === "smtp" ||
    (targetConfig.emailProvider === "auto" && !targetConfig.emailWebhookUrl);

  if (useWebhook && !targetConfig.emailWebhookUrl) {
    missing.push("EMAIL_WEBHOOK_URL");
  }
  if (useWebhook && !targetConfig.emailWebhookToken) {
    missing.push("EMAIL_WEBHOOK_TOKEN");
  }

  if (useSmtp) {
    if (!targetConfig.emailSmtpHost) missing.push("EMAIL_SMTP_HOST");
    if (!targetConfig.emailSmtpUser) missing.push("EMAIL_SMTP_USER");
    if (!targetConfig.emailSmtpPass) missing.push("EMAIL_SMTP_PASS");
  }

  if (!targetConfig.emailFrom) missing.push("EMAIL_FROM");
  if (!targetConfig.emailTo?.length) missing.push("EMAIL_TO");

  if (missing.length > 0) {
    throw new Error(`Missing email configuration: ${missing.join(", ")}`);
  }
}
