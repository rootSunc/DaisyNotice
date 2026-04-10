import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import {
  launchPilkeContext,
  isLoginPage,
  saveStorageState,
} from "../core/pilke.js";

export async function main() {
  const { browser, context } = await launchPilkeContext({
    headless: false,
    storageState: false,
  });
  const page = await context.newPage();

  try {
    await page.goto(config.baseUrl, { waitUntil: "domcontentloaded" });
    console.log(
      "Browser opened. Complete the login flow in the Playwright window.",
    );
    console.log(
      "When the logged-in page is visible, return to this terminal and press Enter.",
    );

    const rl = readline.createInterface({ input, output });
    await rl.question("");
    rl.close();

    if (await isLoginPage(page)) {
      throw new Error(
        "The page still looks like the login screen. Finish the login flow and try again.",
      );
    }

    await saveStorageState(context);
    console.log(`Session saved to ${config.sessionPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
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
