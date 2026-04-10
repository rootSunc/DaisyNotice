import { config, ensureDataDirectories } from "../src/config.js";
import {
  launchPilkeContext,
  openMessagesPage,
  collectMessages,
} from "../src/core/pilke.js";

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
    console.log(`Found ${messages.length} messages`);

    if (messages.length > 0) {
      const msgId = messages[0].id;
      console.log(`Trying to click message 0 (${messages[0].title})`);

      // Click card 0
      const cards = page.locator(".Message2");
      await cards.nth(0).click();
      await page.waitForTimeout(3000); // Wait for open

      const dialogBody = await page.evaluate(() => {
        // Based on the detail structure, try to extract the main body.
        const contentContainers = document.querySelectorAll(
          ".css-1lh0xu5, .MuiTypography-body2",
        );
        let text = "";
        for (const el of contentContainers) {
          if (
            el.className.includes("css-1lh0xu5") ||
            el.className.includes("css-bxmwoh") === false
          ) {
            const t = (el.innerText || "").trim();
            if (t.length > 20) text += t + "\n";
          }
        }
        return text;
      });

      console.log(`\nExtracted body for ${msgId}:\n${dialogBody}`);

      console.log("Trying to return back to list...");
      // In SPA, clicking the 'Messaging' again in the menu returns to the list
      const pilkeMenu = page.locator("#test_Menu_OpenMessaging");
      await pilkeMenu.click();
      await page.waitForTimeout(2000);

      const cardsAfterReturn = page.locator(".Message2");
      const countAfter = await cardsAfterReturn.count();
      console.log(`Returned. Cards count: ${countAfter}`);
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
