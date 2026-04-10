import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";
import { config, ensureDataDirectories } from "../config.js";

const LOGIN_KEYWORDS = ["kirjaudu", "log in", "sign in", "login"];
const DATE_PATTERN =
  /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}:\d{2}|today|yesterday|tänään|eilen)/i;

export async function launchPilkeContext({
  headless,
  storageState = true,
} = {}) {
  ensureDataDirectories();

  const browser = await chromium.launch({ headless });
  const contextOptions = {};

  if (storageState && fs.existsSync(config.sessionPath)) {
    contextOptions.storageState = config.sessionPath;
  }

  const context = await browser.newContext(contextOptions);
  return { browser, context };
}

export async function saveStorageState(context) {
  ensureDataDirectories();
  await context.storageState({ path: config.sessionPath });
}

async function pageBodyText(page) {
  try {
    return await page.locator("body").innerText({ timeout: 3000 });
  } catch {
    return "";
  }
}

export async function isLoginPage(page) {
  const url = page.url().toLowerCase();
  if (url.includes("/login")) {
    return true;
  }

  const bodyText = (await pageBodyText(page)).toLowerCase();
  return LOGIN_KEYWORDS.some((keyword) => bodyText.includes(keyword));
}

async function dismissOverlays(page) {
  // The notification dialog overlays the cookie banner, so dismiss it first.
  const notifBtn = page.locator("#test_DF_Notification_CloseBtn");
  try {
    if (await notifBtn.isVisible({ timeout: 3000 })) {
      await notifBtn.click();
      console.log("Dismissed notification dialog.");
      await page.waitForTimeout(1000);
    }
  } catch {
    // No notification dialog, continue.
  }

  // Then dismiss the cookie consent banner.
  const cookieBtn = page.locator("#test_CookieNote_OkBtn");
  try {
    if (await cookieBtn.isVisible({ timeout: 3000 })) {
      await cookieBtn.click();
      console.log("Dismissed cookie banner.");
      await page.waitForTimeout(1000);
    }
  } catch {
    // No cookie banner, continue.
  }
}

async function autoLogin(page) {
  let username = config.pilkeUsername;
  let password = config.pilkePassword;

  if (!username || !password) {
    console.log(
      "Session expired or credentials missing. Please provide your Pilke login details.",
    );
    const rl = readline.createInterface({ input, output });
    try {
      if (!username) {
        username = (await rl.question("Pilke Username: ")).trim();
      }
      if (!password) {
        // Native readline doesn't have an easy native way to mask passwords without using process.stdin.on('data', ...)
        // We'll just read it normally here for simplicity.
        password = (await rl.question("Pilke Password: ")).trim();
      }
    } finally {
      rl.close();
    }
  }

  if (!username || !password) {
    console.error("Username or password not provided.");
    return false;
  }

  // Save for the duration of the process in case auto-login retries
  config.pilkeUsername = username;
  config.pilkePassword = password;

  console.log("Attempting auto-login...");

  // Navigate to login page if not already there.
  if (!page.url().toLowerCase().includes("/login")) {
    await page.goto(config.baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }

  // Dismiss cookie banner and notification dialogs that may cover the form.
  await dismissOverlays(page);

  // Wait a bit for the login form to render (MUI / React app).
  await page.waitForTimeout(2000);

  // Try common username/email field selectors (Pilke-specific first, then generic).
  const usernameSelectors = [
    "#test_Login_username",
    'input[name="username"]',
    'input[name="email"]',
    'input[name="UserName"]',
    'input[name="Email"]',
    'input[type="email"]',
    'input[id="username"]',
    'input[id="email"]',
    'input[id="UserName"]',
    "#test_Login_UserNameTxt input",
    "#test_Login_UserNameTxt",
    '[data-testid="username"] input',
    '[data-testid="email"] input',
  ];

  const passwordSelectors = [
    "#test_Login_password",
    'input[name="password"]',
    'input[name="Password"]',
    'input[type="password"]',
    'input[id="password"]',
    'input[id="Password"]',
    "#test_Login_PasswordTxt input",
    "#test_Login_PasswordTxt",
    '[data-testid="password"] input',
  ];

  let usernameField = null;
  for (const selector of usernameSelectors) {
    const field = page.locator(selector).first();
    try {
      if (await field.isVisible({ timeout: 1000 })) {
        usernameField = field;
        console.log(`Found username field: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  // If still not found, fall back to the first visible text input.
  if (!usernameField) {
    const fallback = page.locator('input[type="text"]').first();
    try {
      if (await fallback.isVisible({ timeout: 2000 })) {
        usernameField = fallback;
        console.log('Found username field via fallback: input[type="text"]');
      }
    } catch {
      // continue
    }
  }

  let passwordField = null;
  for (const selector of passwordSelectors) {
    const field = page.locator(selector).first();
    try {
      if (await field.isVisible({ timeout: 1000 })) {
        passwordField = field;
        console.log(`Found password field: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!usernameField || !passwordField) {
    // Dump visible inputs for debugging.
    const inputs = await page.evaluate(() =>
      [...document.querySelectorAll("input")].map((el) => ({
        type: el.type,
        name: el.name,
        id: el.id,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      })),
    );
    console.error("Auto-login failed: could not find login form fields.");
    console.error("Inputs on page:", JSON.stringify(inputs));
    return false;
  }

  await usernameField.fill(config.pilkeUsername);
  await passwordField.fill(config.pilkePassword);

  // Try to find and click the submit button.
  const submitSelectors = [
    "#test_Login_LoginBtn",
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Kirjaudu")',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
  ];

  let submitted = false;
  for (const selector of submitSelectors) {
    const button = page.locator(selector).first();
    try {
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        submitted = true;
        console.log(`Clicked submit button: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!submitted) {
    // Fallback: press Enter in the password field.
    await passwordField.press("Enter");
  }

  // Wait for navigation after login.
  try {
    await page.waitForURL(
      (url) => !url.pathname.toLowerCase().includes("/login"),
      {
        timeout: 15000,
      },
    );
  } catch {
    console.error("Auto-login failed: page did not navigate away from login.");
    return false;
  }

  await page.waitForTimeout(2000);

  if (await isLoginPage(page)) {
    console.error(
      "Auto-login failed: still on login page after submission. Check credentials.",
    );
    return false;
  }

  console.log("Auto-login successful.");
  return true;
}

async function waitForHydration(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
}

async function tryClickMessagesNav(page) {
  // Try the Pilke-specific messaging menu item first.
  const pilkeMenu = page.locator("#test_Menu_OpenMessaging");
  try {
    if (await pilkeMenu.isVisible({ timeout: 3000 })) {
      await pilkeMenu.click({ timeout: 3000 });
      await page.waitForTimeout(3000);
      console.log("Navigated to messaging via sidebar menu.");
      return true;
    }
  } catch {
    // Fall through to generic approach.
  }

  // Fallback: try generic nav labels.
  for (const label of config.messagesNavLabels) {
    const regex = new RegExp(label, "i");
    const candidates = [
      page.getByRole("link", { name: regex }).first(),
      page.getByRole("button", { name: regex }).first(),
      page.getByText(regex).first(),
    ];

    for (const candidate of candidates) {
      try {
        if (await candidate.isVisible({ timeout: 1000 })) {
          await candidate.click({ timeout: 2000 });
          await page.waitForTimeout(1500);
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  return false;
}

export async function openMessagesPage(page) {
  // Always start from login/base URL to ensure a fresh session context.
  const targetUrl = config.messagesUrl || config.baseUrl;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await waitForHydration(page);

  if (await isLoginPage(page)) {
    const loginSuccess = await autoLogin(page);

    if (!loginSuccess) {
      throw new Error(
        "Auto-login failed. Please check your username and password, or run `npm run auth` to authenticate manually.",
      );
    }

    // Save refreshed session for next cycle.
    await saveStorageState(page.context());
    console.log("Session refreshed and saved.");
  }

  // Dismiss any overlays that may have appeared after login.
  await dismissOverlays(page);

  // Navigate to messaging via sidebar menu (Pilke SPA ignores direct URL changes).
  await tryClickMessagesNav(page);
  await page.waitForTimeout(2000);
}

function normalizeWhitespace(value) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveFieldsFromText(text) {
  const normalized = normalizeWhitespace(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || "";
  const timestamp = lines.find((line) => DATE_PATTERN.test(line)) || "";
  const bodyLines = lines.slice(1).filter((line) => line !== timestamp);

  return {
    title,
    body: bodyLines.join("\n"),
    timestamp,
  };
}

function buildMessage(record) {
  const base = deriveFieldsFromText(record.text || "");
  const title = record.title || base.title;
  const body = record.body || base.body;
  const timestamp = record.timestamp || base.timestamp;
  const fingerprint = `${record.href || ""}\n${title}\n${body}\n${timestamp}`;
  const id = crypto.createHash("sha1").update(fingerprint).digest("hex");

  return {
    id,
    title,
    body,
    timestamp,
    rawText: record.text || "",
  };
}

async function collectBySelectors(page) {
  const rows = page.locator(config.selectors.row);
  const count = Math.min(await rows.count(), 50);
  const messages = [];

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const text = normalizeWhitespace(await row.innerText().catch(() => ""));
    if (!text) {
      continue;
    }

    const title = config.selectors.title
      ? normalizeWhitespace(
          await row
            .locator(config.selectors.title)
            .first()
            .innerText()
            .catch(() => ""),
        )
      : "";
    const body = config.selectors.body
      ? normalizeWhitespace(
          await row
            .locator(config.selectors.body)
            .first()
            .innerText()
            .catch(() => ""),
        )
      : "";
    const timestamp = config.selectors.date
      ? normalizeWhitespace(
          await row
            .locator(config.selectors.date)
            .first()
            .innerText()
            .catch(() => ""),
        )
      : "";

    messages.push(
      buildMessage({
        text,
        title,
        body,
        timestamp,
      }),
    );
  }

  return dedupeMessages(messages);
}

async function collectByHeuristics(page) {
  const rawRecords = await page.evaluate((datePatternSource) => {
    const candidateSelector = [
      "article",
      "li",
      "tr",
      "[role='row']",
      "a",
      "button",
      ".card",
      ".message",
      ".thread",
      ".conversation",
    ].join(",");
    const datePattern = new RegExp(datePatternSource, "i");

    function isVisible(element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function normalize(value) {
      return value
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    const unique = new Map();
    const elements = [...document.querySelectorAll(candidateSelector)];

    for (const element of elements) {
      if (!isVisible(element)) {
        continue;
      }

      const text = normalize(element.innerText || "");
      if (text.length < 20 || text.length > 2000) {
        continue;
      }

      const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const rect = element.getBoundingClientRect();
      let score = 0;

      if (lines.length >= 2) {
        score += 1;
      }

      if (datePattern.test(text)) {
        score += 2;
      }

      if (rect.height < 600) {
        score += 1;
      }

      const href =
        element instanceof HTMLAnchorElement
          ? element.href
          : element.querySelector("a")?.href || "";
      const key = `${href}\n${text}`;
      const current = unique.get(key);

      if (!current || current.score < score) {
        unique.set(key, {
          text,
          href,
          score,
        });
      }
    }

    return [...unique.values()]
      .sort(
        (left, right) =>
          right.score - left.score || left.text.length - right.text.length,
      )
      .slice(0, 30);
  }, DATE_PATTERN.source);

  return dedupeMessages(rawRecords.map((record) => buildMessage(record)));
}

function dedupeMessages(messages) {
  const unique = new Map();

  for (const message of messages) {
    if (!message.title && !message.body) {
      continue;
    }

    if (!unique.has(message.id)) {
      unique.set(message.id, message);
    }
  }

  return [...unique.values()];
}

async function collectByMessageCards(page) {
  const cards = page.locator(".Message2");
  const count = Math.min(await cards.count(), 50);

  if (count === 0) {
    return [];
  }

  console.log(`Found ${count} Message2 cards.`);
  const messages = [];

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const text = normalizeWhitespace(await card.innerText().catch(() => ""));
    if (!text) {
      continue;
    }

    // Message2 card structure:
    // Line 1: Title (e.g. "Viikkoviesti Vko9 (23-27.2.2026)")
    // Line 2: Sender (e.g. "Auringot:")
    // Line 3+: Body preview
    // Last line(s): Timestamp (e.g. "09:41, 27.02.") and "Total: N"
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const title = lines[0] || "";
    const sender = lines.length > 1 ? lines[1].replace(/:$/, "") : "";

    // Find the timestamp line (matches patterns like "09:41, 27.02." or "16:22, 22.02.")
    const timestampPattern = /^\d{1,2}:\d{2},\s*\d{1,2}\.\d{2}\./;
    const timestampLine = lines.find((l) => timestampPattern.test(l)) || "";
    const timestampIndex = timestampLine
      ? lines.indexOf(timestampLine)
      : lines.length;

    // Body is everything between sender and timestamp, excluding "Total: N" lines
    const bodyLines = lines
      .slice(2, timestampIndex)
      .filter((l) => !l.startsWith("Total:"));
    const body = bodyLines.join("\n");

    const fingerprint = `${title}\n${sender}\n${timestampLine}`;
    const id = crypto.createHash("sha1").update(fingerprint).digest("hex");

    messages.push({
      id,
      title,
      sender,
      body,
      timestamp: timestampLine,
      rawText: text,
      index, // Save the index for clicking later
    });
  }

  // Deduplication based on ID, preserving the original array order and index.
  const uniqueMessages = [];
  const seenIds = new Set();
  for (const msg of messages) {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      uniqueMessages.push(msg);
    }
  }
  return uniqueMessages;
}

export async function fetchMessageBody(page, index) {
  try {
    const cards = page.locator(".Message2");
    if ((await cards.count()) <= index) return null;

    // Click the card
    await cards.nth(index).click();
    await page.waitForTimeout(3000); // Wait for the detail view to open

    // Extract body
    const fullBody = await page.evaluate(() => {
      const contentContainers = document.querySelectorAll(
        ".css-1lh0xu5, .MuiTypography-body2",
      );
      let text = "";
      for (const el of contentContainers) {
        // Exclude attachment names class if possible, focus on actual text containers
        if (
          el.className.includes("css-1lh0xu5") ||
          el.className.includes("css-bxmwoh") === false
        ) {
          const t = (el.innerText || "").trim();
          if (t.length > 20) text += t + "\n\n";
        }
      }
      return text.trim();
    });

    const downloadPaths = [];
    try {
      const downloadBtns = page
        .locator('button, a, [role="button"], .MuiButtonBase-root')
        .filter({ hasText: /^(download|lataa)$/i });
      const count = await downloadBtns.count();
      for (let i = 0; i < count; i++) {
        try {
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 10000 }),
            downloadBtns.nth(i).click(),
          ]);
          const downloadPath = await download.path();
          const suggestedFilename = download.suggestedFilename();
          const permPath = path.join(
            config.dataDir,
            `tmp_${Date.now()}_${suggestedFilename}`,
          );
          fs.copyFileSync(downloadPath, permPath);
          downloadPaths.push(permPath);
        } catch (downloadErr) {
          console.error("Error downloading attachment:", downloadErr);
        }
      }
    } catch (err) {
      console.error("Error checking attachments:", err);
    }

    // Return to list
    const pilkeMenu = page.locator("#test_Menu_OpenMessaging");
    await pilkeMenu.click();
    await page.waitForTimeout(2000); // Wait for list to render

    return { body: fullBody, attachments: downloadPaths };
  } catch (err) {
    console.error("Error fetching message body:", err);
    return null;
  }
}

export async function collectMessages(page) {
  // Try Pilke Message2 cards first.
  const cardMessages = await collectByMessageCards(page);
  if (cardMessages.length > 0) {
    return cardMessages;
  }

  // Fall back to selector-based or heuristic collection.
  if (config.selectors.row) {
    return collectBySelectors(page);
  }

  return collectByHeuristics(page);
}

export async function saveDebugArtifacts(page, prefix) {
  if (!config.debugCapture) {
    return;
  }

  ensureDataDirectories();
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "_");
  const htmlPath = path.join(config.debugDir, `${safePrefix}.html`);
  const screenshotPath = path.join(config.debugDir, `${safePrefix}.png`);

  await page
    .screenshot({ path: screenshotPath, fullPage: true })
    .catch(() => {});
  await fs.promises
    .writeFile(htmlPath, await page.content(), "utf8")
    .catch(() => {});
}
