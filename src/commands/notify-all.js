import { pathToFileURL } from "node:url";
import { runPoll } from "../app.js";

export async function main() {
  // Parse command line argument for number of recent messages to notify
  const arg = process.argv[2];
  let messagesToNotify = null;

  if (arg) {
    const num = parseInt(arg, 10);
    if (!isNaN(num) && num > 0) {
      messagesToNotify = num;
      console.log(
        `Starting forced sync to send the last ${num} messages to Telegram...`,
      );
    } else {
      console.warn(
        `Invalid argument "${arg}". Expected a positive integer. Will notify all messages.`,
      );
      console.log(
        "Starting forced sync to send all existing messages to Telegram...",
      );
    }
  } else {
    console.log(
      "Starting forced sync to send all existing messages to Telegram...",
    );
  }

  const result = await runPoll({
    forceNotifyAll: true,
    messagesToNotify,
  });

  console.log(
    `Forced sync completed. Found ${result.totalMessages} messages, notified ${result.notifiedMessages}.`,
  );
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
