import { pathToFileURL } from "node:url";
import { config } from "../config.js";

function isSelected(channel) {
  return (
    config.notificationChannels.includes(channel) ||
    config.notificationChannels.includes("all") ||
    (channel !== "email" && config.notificationChannels.includes("both"))
  );
}

function status(value) {
  return value ? "set" : "missing";
}

export async function main() {
  const wantsEmail = isSelected("email");
  const wantsTelegram = isSelected("telegram");
  const wantsWechat = isSelected("wechat");
  const missing = [];

  console.log(`Notification channels: ${config.notificationChannels.join(",")}`);
  console.log(`Telegram selected: ${wantsTelegram ? "yes" : "no"}`);
  console.log(`WeChat selected: ${wantsWechat ? "yes" : "no"}`);
  console.log(`Email selected: ${wantsEmail ? "yes" : "no"}`);

  if (wantsEmail) {
    console.log(`Email provider: ${config.emailProvider}`);
    console.log(`EMAIL_WEBHOOK_URL: ${status(config.emailWebhookUrl)}`);
    console.log(`EMAIL_WEBHOOK_TOKEN: ${status(config.emailWebhookToken)}`);
    console.log(`EMAIL_FROM: ${status(config.emailFrom)}`);
    console.log(`EMAIL_TO recipients: ${config.emailTo.length}`);

    if (config.emailProvider !== "webhook") {
      missing.push("EMAIL_PROVIDER=webhook");
    }
    if (!config.emailWebhookUrl) missing.push("EMAIL_WEBHOOK_URL");
    if (!config.emailWebhookToken) missing.push("EMAIL_WEBHOOK_TOKEN");
    if (!config.emailFrom) missing.push("EMAIL_FROM");
    if (!config.emailTo.length) missing.push("EMAIL_TO");
  }

  if (wantsTelegram) {
    console.log(`TELEGRAM_BOT_TOKEN: ${status(config.telegramBotToken)}`);
    console.log(`TELEGRAM_CHAT_ID: ${status(config.telegramChatId)}`);
    if (!config.telegramBotToken) missing.push("TELEGRAM_BOT_TOKEN");
    if (!config.telegramChatId) missing.push("TELEGRAM_CHAT_ID");
  }

  if (wantsWechat) {
    console.log(`WECHAT_WEBHOOK_URL: ${status(config.wechatWebhookUrl)}`);
    if (!config.wechatWebhookUrl) missing.push("WECHAT_WEBHOOK_URL");
  }

  if (!wantsTelegram && !wantsWechat && !wantsEmail) {
    missing.push("NOTIFICATION_CHANNELS (no valid channel selected)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Notification configuration is incomplete: ${missing.join(", ")}`,
    );
  }

  console.log("Notification config check passed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
