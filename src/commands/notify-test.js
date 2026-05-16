import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { sendFormattedNotification } from "../core/notifier.js";

export async function main() {
  const timestamp = new Date().toISOString();

  await sendFormattedNotification(config, {
    title: "DaisyNotice notification test",
    sender: "GitHub Actions",
    timestamp,
    body:
      "This is a test notification from DaisyNotice. If you received this message, the configured notification channels are working.",
    id: `test-${timestamp}`,
  });

  console.log("Test notification completed.");
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
