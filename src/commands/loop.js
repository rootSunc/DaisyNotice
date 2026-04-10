import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { runPoll } from "../app.js";

async function executeCycle() {
  try {
    const result = await runPoll();
    const notifiedPart =
      result.mode === "seeded"
        ? `seeded ${result.totalMessages} existing messages`
        : `found ${result.totalMessages} messages, notified ${result.notifiedMessages}`;
    console.log(
      `[${new Date().toISOString()}] Poll finished: ${notifiedPart}.`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Poll failed: ${error.message}`,
    );
  }
}

export async function main() {
  const intervalMs = config.pollIntervalHours * 60 * 60 * 1000;
  console.log(
    `Starting DaisyNotice. Poll interval: ${config.pollIntervalHours} hour(s).`,
  );

  let running = false;
  const runSafely = async () => {
    if (running) {
      console.log("Skipping overlapping poll cycle.");
      return;
    }

    running = true;
    try {
      await executeCycle();
    } finally {
      running = false;
    }
  };

  await runSafely();
  const timer = setInterval(runSafely, intervalMs);

  const shutdown = () => {
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
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
