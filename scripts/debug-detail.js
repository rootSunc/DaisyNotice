import { config, ensureDataDirectories } from "../src/config.js";
import { launchPilkeContext, openMessagesPage } from "../src/core/pilke.js";
import path from "node:path";

async function main() {
  ensureDataDirectories();
  const { browser, context } = await launchPilkeContext({
    headless: true,
    storageState: true,
  });
  const page = await context.newPage();

  try {
    await openMessagesPage(page);

    // Click the first Message2 card
    const cards = page.locator(".Message2");
    const count = await cards.count();
    console.log(`Found ${count} cards`);

    if (count > 0) {
      const firstCard = cards.first();
      const cardText = await firstCard.innerText();
      console.log(`\nFirst card preview:\n${cardText.slice(0, 200)}`);

      // Click the card
      await firstCard.click();
      await page.waitForTimeout(3000);

      const screenshotPath = path.join(config.debugDir, "message-detail.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\nDetail screenshot saved: ${screenshotPath}`);
      console.log(`URL: ${page.url()}`);

      // Get the full page text
      const bodyText = await page.locator("body").innerText();
      console.log(`\n=== Detail page text (first 1000 chars) ===`);
      console.log(bodyText.slice(0, 1000));

      // Look for message content containers
      const containers = await page.evaluate(() => {
        const candidates = document.querySelectorAll(
          '[class*="Message"], [class*="message"], [class*="content"], [class*="Content"], [class*="body"], [class*="Body"], [class*="detail"], [class*="Detail"], .MuiCardContent-root, .MuiDialogContent-root, .MuiPaper-root',
        );
        return [...candidates].slice(0, 20).map((el) => ({
          tag: el.tagName,
          className: (el.className || "").toString().slice(0, 120),
          text: (el.innerText || "").trim().slice(0, 300),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          rect: { w: el.offsetWidth, h: el.offsetHeight },
        }));
      });
      console.log("\n=== Content containers ===");
      console.log(JSON.stringify(containers, null, 2));

      // Check for back button
      const backBtns = await page.evaluate(() => {
        return [...document.querySelectorAll('button, a, [role="button"]')]
          .filter((el) => {
            const text = (el.innerText || "").toLowerCase();
            const ariaLabel = (
              el.getAttribute("aria-label") || ""
            ).toLowerCase();
            return (
              text.includes("back") ||
              text.includes("takaisin") ||
              ariaLabel.includes("back") ||
              el.querySelector('svg[data-testid="ArrowBackIcon"]')
            );
          })
          .map((el) => ({
            tag: el.tagName,
            id: el.id,
            text: (el.innerText || "").trim().slice(0, 50),
            ariaLabel: el.getAttribute("aria-label") || "",
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          }));
      });
      console.log("\n=== Back buttons ===");
      console.log(JSON.stringify(backBtns, null, 2));
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
