import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, "data");
const debugDir = path.join(dataDir, "debug");

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
  debugCapture: process.env.DEBUG_CAPTURE === "1",
};

export function ensureDataDirectories() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.debugDir, { recursive: true });
}

export function validateTelegramConfig() {
  if (!config.telegramBotToken || !config.telegramChatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
  }
}

export function validateWechatConfig() {
  if (!config.wechatWebhookUrl) {
    throw new Error("Missing WECHAT_WEBHOOK_URL in .env");
  }
}
