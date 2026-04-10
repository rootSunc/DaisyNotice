import { config, ensureDataDirectories } from "../src/config.js";
import { launchPilkeContext, openMessagesPage } from "../src/core/pilke.js";
import path from "node:path";
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

    // Look for the "important information" message which has an attachment
    const cards = page.locator(".Message2");
    await cards.nth(0).click(); // We know the first seen was important info in my previous test but wait, we deleted it. Actually let's just find the first one that has "Total:" or an attachment icon, or just click the first one that has attachments.
    // Let's just click the first one we see with the paperclip icon or "Attachments:" text in the card preview if any. Or we just click the first.
    // The previous debug log showed: "Tärkeä informaatio / Important information" is the first one. It has an attachment!
    await page.waitForTimeout(3000);

    // Find download buttons. In the screenshot, it says "Download"
    const downloadBtns = page
      .locator("button, a")
      .filter({ hasText: /^Download$/i });
    const count = await downloadBtns.count();
    console.log(`Found ${count} download buttons`);

    if (count > 0) {
      // Trigger download
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }),
        downloadBtns.first().click(),
      ]);

      const downloadPath = await download.path();
      const suggestedFilename = download.suggestedFilename();
      console.log(
        `Downloaded to ${downloadPath}, suggested name: ${suggestedFilename}`,
      );

      const permPath = path.join(config.dataDir, suggestedFilename);
      fs.copyFileSync(downloadPath, permPath);
      console.log(`Saved to ${permPath}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
