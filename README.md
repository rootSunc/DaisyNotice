# DaisyNotice

> Never miss a Pilke DaisyFamily message again.

**[中文文档](README.zh.md)**

DaisyNotice watches your Pilke inbox and pushes new messages to **Telegram**, **WeChat Work**, or **email** — with Finnish → English translation built in.

Pilke has no real-time push and no multi-user alerts. DaisyNotice fills that gap for you and your family.

---

## Features

- 🔄 **Auto polling** — Playwright logs in and checks for new messages on a schedule
- 🧠 **Smart dedupe** — timestamp-based tracking, no spam from the same message
- 📢 **Multi-channel** — Telegram / WeChat Work / email, pick any combination
- 🇬🇧 **Finnish → English** — Finnish-only messages are translated automatically
- 📎 **Attachments** — downloads and forwards files when available
- ☁️ **Zero server needed** — run on GitHub Actions for free, or locally on Node.js 20+

---

## Quick Start (recommended): GitHub Actions

No VPS. No Docker. Fork once, add secrets, done.

### 1. Fork this repo

Fork → your GitHub account.

### 2. Enable Actions

In your fork: **Settings → Actions → General → Allow all actions**.

Then open **Actions** and enable workflows if GitHub asks.

### 3. Add repository secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Description |
|--------|----------|-------------|
| `PILKE_USERNAME` | ✅ | Pilke login username |
| `PILKE_PASSWORD` | ✅ | Pilke login password |
| `NOTIFICATION_CHANNELS` | ✅ | e.g. `telegram`, `email`, `telegram,email`, or `all` |
| `TELEGRAM_BOT_TOKEN` | if using Telegram | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | if using Telegram | Your chat / group id |
| `WECHAT_WEBHOOK_URL` | if using WeChat | WeChat Work bot webhook |
| `EMAIL_WEBHOOK_URL` | if using email on Actions | Google Apps Script Web App URL |
| `EMAIL_WEBHOOK_TOKEN` | if using email on Actions | Same token as in the GAS script |
| `EMAIL_FROM` | if using email | From address |
| `EMAIL_TO` | if using email | Recipients, comma-separated |

> On GitHub Actions, prefer the email **webhook** path. Hosted runners often block SMTP ports.

### 4. Test & go live

1. **Actions → DaisyNotice Poll → Run workflow**
2. Enable `send_test_notification` to verify Telegram / email / WeChat
3. Run again without the test flag to do the first real poll  
   (first run marks existing messages as seen and sends a setup confirmation)
4. After that, the workflow runs on the schedule in `.github/workflows/poll.yml` (default: daily at 12:00 UTC)

---

## Alternative: run locally

```bash
git clone https://github.com/rootSunc/daisy-notice.git
cd daisy-notice
npm install
npx playwright install chromium
cp .env.example .env
```

Edit `.env` with at least:

```env
PILKE_USERNAME=your-username
PILKE_PASSWORD=your-password
NOTIFICATION_CHANNELS=telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Then:

```bash
npm run notify-test   # verify notification channels
npm run poll          # one-shot check
npm start             # keep polling (default every 8 hours)
```

If auto-login fails, run `npm run auth` once in a visible browser, then retry.

**Requires Node.js 20+.**

---

## Notification channels

```env
NOTIFICATION_CHANNELS=telegram,email
```

| Value | Channels |
|-------|----------|
| `telegram` | Telegram Bot |
| `wechat` | WeChat Work webhook |
| `email` | Email (webhook or SMTP) |
| `both` | Telegram + WeChat |
| `all` | Telegram + WeChat + email |

### Email on GitHub Actions (webhook)

1. Sign in to [Google Apps Script](https://script.google.com) with the sender Gmail account
2. Paste `docs/google-apps-script-email-webhook.gs`
3. Replace `TOKEN` with a long random string
4. Deploy as Web App: **Execute as: Me**, **Who has access: Anyone**
5. Save the Web App URL + token as secrets:

```env
EMAIL_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
EMAIL_WEBHOOK_TOKEN=your-long-random-token
EMAIL_FROM=notice@example.com
EMAIL_TO=person1@example.com,person2@example.com
```

### Email via SMTP (local / self-hosted)

```env
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_USER=notice@example.com
EMAIL_SMTP_PASS=your-app-password
EMAIL_FROM=notice@example.com
EMAIL_TO=person1@example.com,person2@example.com
```

---

## Finnish → English translation

When a message looks Finnish-only, DaisyNotice appends an English translation to the title and body before sending the notification.

- Mixed Finnish / English messages are left as-is
- Uses Google’s public translate endpoint (unofficial; may rate-limit or change)
- No API key required
- Failures are non-fatal — you still get the original Finnish text

---

## Commands

| Command | What it does |
|---------|----------------|
| `npm run notify-test` | Send a test notification (no Pilke login) |
| `npm run poll` | Check once for new messages |
| `npm start` | Poll forever on `POLL_INTERVAL_HOURS` (default 8) |
| `npm run notify-all [N]` | Resend latest N messages (or all) |
| `npm run auth` | Interactive browser login, save `data/session.json` |
| `npm run check-notification-config` | Validate selected channel env vars |

**First `poll` / Actions run:** marks current inbox as seen and sends a setup confirmation. Later runs only notify on newer messages.

---

## Optional config

| Variable | Default | Notes |
|----------|---------|-------|
| `POLL_INTERVAL_HOURS` | `8` | Local `npm start` interval |
| `INITIAL_SYNC_MODE` | `mark-seen` | First run: mark existing as seen |
| `MESSAGES_URL` | empty | Direct inbox URL if auto-nav fails |
| `DEBUG_CAPTURE` | `0` | Set `1` to save HTML/screenshots under `data/debug/` |
| `MESSAGE_*_SELECTOR` | empty | Override CSS selectors if Pilke UI changes |

See [`.env.example`](.env.example) for the full list.

---

## Disclaimer

For personal learning and research only. Automating access to Pilke may violate its Terms of Service. **You assume all risk.**

---

## License

[MIT](LICENSE)
