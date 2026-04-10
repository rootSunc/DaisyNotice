import { pathToFileURL } from "node:url";
import { runPoll } from "../app.js";

export async function main() {
  console.log(
    "Starting forced sync to send all existing messages to Telegram...",
  );
  const result = await runPoll({ forceNotifyAll: true });

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
