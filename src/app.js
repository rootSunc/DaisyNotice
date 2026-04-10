import { config } from "./config.js";
import { sendFormattedNotification } from "./core/notifier.js";
import {
  launchPilkeContext,
  openMessagesPage,
  collectMessages,
  saveDebugArtifacts,
} from "./core/pilke.js";
import {
  loadState,
  saveState,
  hasSeenMessage,
  rememberMessage,
} from "./core/state.js";
import fs from "node:fs";

export async function runPoll({ forceNotifyAll = false } = {}) {
  const state = await loadState();
  const { browser, context } = await launchPilkeContext({
    headless: true,
    storageState: true,
  });
  const page = await context.newPage();

  try {
    await openMessagesPage(page);
    const messages = await collectMessages(page);

    if (messages.length === 0) {
      await saveDebugArtifacts(page, "no-messages");
      throw new Error(
        "No messages were detected. Set MESSAGES_URL or selector overrides in .env.",
      );
    }

    const isFirstSync = Object.keys(state.seen).length === 0;
    if (
      !forceNotifyAll &&
      isFirstSync &&
      config.initialSyncMode === "mark-seen"
    ) {
      for (const message of messages) {
        rememberMessage(state, message);
      }

      state.lastRunAt = new Date().toISOString();
      await saveState(state);
      return {
        mode: "seeded",
        totalMessages: messages.length,
        notifiedMessages: 0,
      };
    }

    let notifiedMessages = 0;
    for (const message of messages) {
      if (!forceNotifyAll && hasSeenMessage(state, message.id)) {
        continue;
      }

      let attachments = [];
      if (typeof message.index === "number") {
        const { fetchMessageBody } = await import("./core/pilke.js");
        const details = await fetchMessageBody(page, message.index);
        if (details) {
          message.body = details.body;
          attachments = details.attachments || [];
        }
      }

      const { applyTranslationIfNeeded } = await import("./core/translate.js");
      await applyTranslationIfNeeded(message);

      await sendFormattedNotification(config, message, attachments);
      rememberMessage(state, message);
      notifiedMessages += 1;
      await saveState(state);

      // Cleanup tmp attachments
      for (const filePath of attachments) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error("Failed to cleanup file:", filePath, e);
        }
      }
    }

    state.lastRunAt = new Date().toISOString();
    await saveState(state);

    return {
      mode: "notify",
      totalMessages: messages.length,
      notifiedMessages,
    };
  } catch (error) {
    await saveDebugArtifacts(page, "poll-error");
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
