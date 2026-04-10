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
- ✅ **Time-Based Deduplication** — Smart timestamp-based message tracking

---

## Prerequisites

- Node.js 20+
- npm or yarn

---

## Commands Guide

| Command | Execution | Purpose | Use Case |
|---------|-----------|---------|----------|
| `npm run auth` | One-time | Browser login to Pilke & save session | First-time setup, session expired |
| `npm run poll` | One-time | Check for new messages once | Manual testing, development, ad-hoc checking |
| `npm run notify-all [N]` | One-time | Resend messages (latest N or all) | Re-notify specific messages, testing |
| `npm start` | Continuous | Auto-monitor & notify on interval | Production use, 24/7 monitoring |

### Command Details

#### `npm run auth`
- **First use only** — logs into Pilke and saves session
- Stores session to `data/session.json` for reuse
- Re-run only if session expires

#### `npm run poll`
- Runs **once** and exits
- **First run:** Marks all existing messages as seen (no notifications)
- **Later runs:** Pushes only new messages
- Best for: Testing, debugging, manual checks

#### `npm run notify-all [N]`
- Runs **once** and exits
- `npm run notify-all 5` — resend the last 5 messages (oldest→newest order)
- `npm run notify-all` — resend all messages
- Messages are sorted chronologically (oldest first) before sending
- Best for: Testing, re-notifying specific messages, demos

#### `npm start`
- Runs **continuously** in background
- Auto-executes poll every `POLL_INTERVAL_HOURS` (default: 8 hours)
- Stops on Ctrl+C
- Best for: Production environment, 24/7 monitoring

---

## Disclaimer

This project is for personal learning and technical research purposes only. Using this project's scripts to access the Pilke platform may violate its Terms of Service. The author is not responsible for the consequences caused by using this tool. **Before use, carefully read the relevant Terms of Service. All risks are assumed by the user.**

---

## License

MIT [LICENSE](LICENSE)