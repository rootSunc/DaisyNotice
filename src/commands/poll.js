import { pathToFileURL } from "node:url";
import { runPoll } from "../app.js";

export async function main() {
  const result = await runPoll();

  if (result.mode === "seeded") {
    console.log(
      `Initial sync completed. Marked ${result.totalMessages} existing messages as seen.`,
    );
    return;
  }

  console.log(
    `Poll completed. Found ${result.totalMessages} messages, notified ${result.notifiedMessages}.`,
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
