import { config, ensureDataDirectories } from "../src/config.js";
import {
  launchPilkeContext,
  openMessagesPage,
  collectMessages,
  fetchMessageBody,
} from "../src/core/pilke.js";
import {
  sendTelegramMessage,
  formatTelegramMessage,
} from "../src/core/notifier.js";
import fs from "node:fs";

async function main() {
  ensureDataDirectories();
  const { browser, context } = await launchPilkeContext({
    headless: true,
    storageState: true,
  });
  const page = await context.newPage();

  try {
    await openMessagesPage(page);
    const messages = await collectMessages(page);

    if (messages.length === 0) {
      console.log("No messages found.");
      return;
    }

    const firstMessage = messages[1];
    console.log(`Testing with first message: ${firstMessage.title}`);

    let attachments = [];
    if (typeof firstMessage.index === "number") {
      const details = await fetchMessageBody(page, firstMessage.index);
      if (details) {
        firstMessage.body = details.body;
        attachments = details.attachments || [];
      }
    }

    console.log(`Message fetched. Found ${attachments.length} attachments.`);

    const { applyTranslationIfNeeded } =
      await import("../src/core/translate.js");
    await applyTranslationIfNeeded(firstMessage);

    await sendTelegramMessage(
      config,
      formatTelegramMessage(firstMessage),
      attachments,
    );
    console.log("Sent successfully to Telegram bot!");

    for (const filePath of attachments) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);
