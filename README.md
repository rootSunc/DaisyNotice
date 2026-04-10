# DaisyNotice

> 🔔 Pilke Message Monitoring & Multi-Channel Notification Tool

**[中文文档](README.zh.md)**

---

## Project Overview

DaisyNotice is a lightweight Node.js background service that automatically monitors your Pilke DaisyFamily message inbox and pushes new messages to Telegram or WeChat in real-time.

**Problem Solved:** The Pilke DaisyFamily platform lacks real-time notification capabilities and cannot notify multiple users, making it easy to miss important messages. DaisyNotice helps you and your family get the latest messages in a timely manner.

---

## Core Features

- ✅ **Automated Monitoring** — Periodic polling via Playwright browser automation
- ✅ **No Duplicate Notifications** — Local JSON records read messages for intelligent deduplication
- ✅ **Multi-Channel Delivery** — Simultaneous support for Telegram and WeChat
- ✅ **Zero Cloud Dependencies** — No external services, local execution, full data control
- ✅ **Highly Customizable** — Custom CSS selectors, configurable polling intervals, and more
- ✅ **Session Persistence** — Manual login once, automatic session reuse afterward

---

## Table of Contents

- [Quick Start](#quick-start)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation Steps

**1. Clone the Project**
```bash
git clone <repo-url>
cd DaisyNotice
npm install
npx playwright install chromium
```

**2. Configure Notification Channels**

Copy the environment variables template:
```bash
cp .env.example .env
```

Edit `.env`, and configure at least one of the following:
- **Telegram**: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- **WeChat**: `WECHAT_WEBHOOK_URL`

**3. First-Time Login**
```bash
npm run auth
```
- The browser will automatically open the Pilke login page
- Manually enter your account credentials
- After successful login, press the Enter key in your terminal
- Session automatically saved to `data/session.json`

**4. Test**
```bash
npm run poll
```
If you receive a test notification, the configuration is successful!

**5. Run in Background**
```bash
npm start
```

---

## Detailed Configuration

### Environment Variables Reference

#### Notification Channel Configuration

**Telegram (Optional)**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNopqrstuvwxyz
TELEGRAM_CHAT_ID=987654321  # Get via @userinfobot
```

**WeChat (Optional)**
```env
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxx
```

#### Polling Behavior Configuration

```env
# Polling interval (in hours)
POLL_INTERVAL_HOURS=8

# Initial sync mode
# mark-seen: Mark existing messages as read (recommended to avoid message flooding)
# notify: Send all existing messages
INITIAL_SYNC_MODE=mark-seen
```

#### Message Extraction Configuration (Optional)

If auto-detection fails, manually specify CSS selectors:

```env
# Pilke messages page URL
MESSAGES_URL=https://pilke.com/daisyfamily/messages

# Message row selector
MESSAGE_ROW_SELECTOR=.message-row

# Other selectors
MESSAGE_TITLE_SELECTOR=.message-title
MESSAGE_BODY_SELECTOR=.message-body
MESSAGE_DATE_SELECTOR=.message-date
```

---

### Data Storage

- `data/session.json` — Browser session (login state)
- `data/state.json` — Local state of read messages (for deduplication)
- `data/debug/` — Debug files

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login failed | Check network connection and account validity |
| Not receiving notifications | Check notification channel configuration and run `npm run poll` to test |
| Receiving duplicate messages | Delete `data/state.json` and re-run initial sync |
| Message parsing errors | Check if website HTML structure changed, adjust CSS selectors |

---

## License

MIT — See [LICENSE](LICENSE) file.

---

## Disclaimer

This project is for personal learning and technical research purposes only. Using this project's scripts to access the Pilke platform may violate its Terms of Service. The author is not responsible for the consequences caused by using this tool. **Before use, carefully read the relevant Terms of Service. All risks are assumed by the user.**
```
