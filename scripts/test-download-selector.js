import { launchPilkeContext, openMessagesPage } from "../src/core/pilke.js";
async function main() {
  const { browser, context } = await launchPilkeContext({
    headless: true,
    storageState: true,
  });
  const page = await context.newPage();
  await openMessagesPage(page);
  await page.locator(".Message2").first().click();
  await page.waitForTimeout(3000);

  const els = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(
        'a, button, [role="button"], li, .MuiListItem-root',
      ),
    )
      .map((el) => {
        const cls = el.className || "";
        const txt = (el.innerText || "").slice(0, 100);
        return {
          tag: el.tagName,
          txt: txt.trim(),
          cls: typeof cls === "string" ? cls : "",
        };
      })
      .filter(
        (e) =>
          e.txt.toLowerCase().includes(".pdf") ||
          e.txt.toLowerCase().includes("download") ||
          e.txt.toLowerCase().includes("lataa"),
      );
  });
  console.log("Found matches:");
  console.log(JSON.stringify(els, null, 2));

  await context.close();
  await browser.close();
}
main();
