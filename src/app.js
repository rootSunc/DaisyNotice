import { config } from "./config.js";
import { sendFormattedNotification, sendNotification } from "./core/notifier.js";
import {
  launchPilkeContext,
  openMessagesPage,
  collectMessages,
  saveDebugArtifacts,
} from "./core/pilke.js";
import { loadState, saveState, isNewMessage } from "./core/state.js";
import fs from "node:fs";

// Parse timestamp string like "09:41, 27.02." to a Date object
// Assumes current year if year is not provided
function parseTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return new Date(0); // Fallback to epoch if invalid
  }

  // Handle format: "HH:MM, DD.MM." or similar variations
  const pattern = /(\d{1,2}):(\d{2}),\s*(\d{1,2})\.(\d{2})\./;
  const match = timestampStr.match(pattern);

  if (!match) {
    return new Date(0); // Fallback if pattern doesn't match
  }

  const [, hours, minutes, day, month] = match;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date with current year, parsed month and day
  // Note: months are 0-indexed in Date constructor
  const date = new Date(
    currentYear,
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
  );

  // If the parsed date is in the future, use previous year
  if (date > now) {
    date.setFullYear(currentYear - 1);
  }

  return date;
}

// Sort messages by timestamp from oldest to newest
function sortMessagesByTimestamp(messages) {
  return messages.sort((a, b) => {
    const dateA = parseTimestamp(a.timestamp);
    const dateB = parseTimestamp(b.timestamp);
    return dateA.getTime() - dateB.getTime();
  });
}

export async function runPoll({
  forceNotifyAll = false,
  messagesToNotify = null,
} = {}) {
  const state = await loadState();
  const { browser, context } = await launchPilkeContext({
    headless: true,
    storageState: false,
  });
  const page = await context.newPage();

  try {
    await openMessagesPage(page);
    let messages = await collectMessages(page);

    if (messages.length === 0) {
      await saveDebugArtifacts(page, "no-messages");
      throw new Error(
        "No messages were detected. Set MESSAGES_URL or selector overrides in .env.",
      );
    }

    // For forceNotifyAll, always sort by timestamp (oldest to newest)
    if (forceNotifyAll) {
      messages = sortMessagesByTimestamp(messages);
      // If messagesToNotify is specified, filter to only the last N messages
      if (messagesToNotify !== null) {
        messages = messages.slice(-messagesToNotify);
        console.log(
          `Filtered to the last ${messages.length} message(s) out of total.`,
        );
      }
    }

    // Check if this is the first sync (no lastRunAt timestamp yet)
    const isFirstSync = !state.lastRunAt;
    if (
      !forceNotifyAll &&
      isFirstSync &&
      config.initialSyncMode === "mark-seen"
    ) {
      // First sync: mark all current messages as seen by setting lastRunAt
      state.lastRunAt = new Date().toISOString();
      await saveState(state);

      // Send a success notification to confirm setup is working
      try {
        await sendNotification(
          config,
          "🚀 DaisyNotice successfully initialized! I am now monitoring for new messages.",
        );
      } catch (e) {
        console.error("Failed to send initialization notification:", e.message);
      }

      return {
        mode: "seeded",
        totalMessages: messages.length,
        notifiedMessages: 0,
      };
    }

    let notifiedMessages = 0;
    for (const message of messages) {
      const messageDate = parseTimestamp(message.timestamp);

      // Skip message if it's not new (unless forceNotifyAll is set)
      if (!forceNotifyAll && !isNewMessage(state, messageDate)) {
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
      notifiedMessages += 1;

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
