# DaisyNotice

> 再也不用担心错过 Pilke DaisyFamily 消息。

**[English](README.md)**

DaisyNotice 会监控你的 Pilke 收件箱，把新消息推送到 **Telegram**、**企业微信** 或 **邮箱**，并自带 **芬兰语 → 英语** 翻译。

Pilke 没有实时推送，也无法通知多个家庭成员。DaisyNotice 就是为解决这个痛点而生。

---

## 功能特性

- 🔄 **自动轮询** — Playwright 登录并按计划检查新消息
- 🧠 **智能去重** — 基于时间戳追踪，同一条消息不会反复轰炸
- 📢 **多渠道推送** — Telegram / 企业微信 / 邮件，可任意组合
- 🇬🇧 **芬兰语 → 英语** — 纯芬兰语消息自动附带英文翻译
- 📎 **附件转发** — 有附件时自动下载并一并推送
- ☁️ **无需自己的服务器** — 免费跑在 GitHub Actions，或本地 Node.js 20+

---

## 最快上手（推荐）：GitHub Actions

不用买服务器，不用装 Docker。Fork 一次，配好 Secrets 即可。

### 1. Fork 本仓库

点右上角 **Fork** 到你的 GitHub 账号。

### 2. 开启 Actions

进入你的 Fork：**Settings → Actions → General → Allow all actions**。

如有提示，再到 **Actions** 页启用工作流。

### 3. 添加仓库 Secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | 是否必需 | 说明 |
|--------|----------|------|
| `PILKE_USERNAME` | ✅ | Pilke 登录用户名 |
| `PILKE_PASSWORD` | ✅ | Pilke 登录密码 |
| `NOTIFICATION_CHANNELS` | ✅ | 例如 `telegram`、`email`、`telegram,email` 或 `all` |
| `TELEGRAM_BOT_TOKEN` | 使用 Telegram 时 | 向 [@BotFather](https://t.me/BotFather) 申请 |
| `TELEGRAM_CHAT_ID` | 使用 Telegram 时 | 你的聊天 / 群组 ID |
| `WECHAT_WEBHOOK_URL` | 使用企业微信时 | 企业微信机器人 Webhook |
| `EMAIL_WEBHOOK_URL` | Actions 上用邮件时 | Google Apps Script Web App URL |
| `EMAIL_WEBHOOK_TOKEN` | Actions 上用邮件时 | 与 GAS 脚本中的 TOKEN 一致 |
| `EMAIL_FROM` | 使用邮件时 | 发件地址 |
| `EMAIL_TO` | 使用邮件时 | 收件人，逗号分隔 |

> 在 GitHub Actions 上优先用邮件 **Webhook**。托管 Runner 经常会拦截 SMTP 端口。

### 4. 测试并启用

1. **Actions → DaisyNotice Poll → Run workflow**
2. 勾选 `send_test_notification`，验证 Telegram / 邮件 / 企业微信是否通
3. 再跑一次正式轮询（不要勾选测试）  
   （首次运行会把现有消息标为已读，并发送一条初始化成功通知）
4. 之后按 `.github/workflows/poll.yml` 中的定时任务自动执行（默认每天 12:00 UTC）

---

## 备选：本地运行

```bash
git clone https://github.com/rootSunc/daisy-notice.git
cd daisy-notice
npm install
npx playwright install chromium
cp .env.example .env
```

至少在 `.env` 里填好：

```env
PILKE_USERNAME=your-username
PILKE_PASSWORD=your-password
NOTIFICATION_CHANNELS=telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

然后：

```bash
npm run notify-test   # 验证通知渠道
npm run poll          # 检查一次
npm start             # 持续轮询（默认每 8 小时）
```

如果自动登录失败，可在有图形界面的环境跑一次 `npm run auth`，再重试。

**需要 Node.js 20+。**

---

## 通知渠道

```env
NOTIFICATION_CHANNELS=telegram,email
```

| 值 | 渠道 |
|----|------|
| `telegram` | Telegram Bot |
| `wechat` | 企业微信 Webhook |
| `email` | 邮件（Webhook 或 SMTP） |
| `both` | Telegram + 企业微信 |
| `all` | Telegram + 企业微信 + 邮件 |

### GitHub Actions 上的邮件（Webhook）

1. 用发件人的 Gmail 登录 [Google Apps Script](https://script.google.com)
2. 粘贴 `docs/google-apps-script-email-webhook.gs`
3. 把 `TOKEN` 换成一段长随机字符串
4. 部署为 Web App：**Execute as: Me**，**Who has access: Anyone**
5. 把 Web App URL 和 token 存进 Secrets：

```env
EMAIL_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
EMAIL_WEBHOOK_TOKEN=your-long-random-token
EMAIL_FROM=notice@example.com
EMAIL_TO=person1@example.com,person2@example.com
```

### SMTP 邮件（本地 / 自建）

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

## 芬兰语 → 英语翻译

当消息看起来是纯芬兰语时，DaisyNotice 会在推送前给标题和正文附上英文翻译。

- 芬兰语 / 英语混排的消息不会翻译
- 使用 Google 公开翻译接口（非官方，可能限流或变更）
- 无需 API Key
- 翻译失败不影响推送 —— 你仍会收到原始芬兰语内容

---

## 命令一览

| 命令 | 作用 |
|------|------|
| `npm run notify-test` | 发送测试通知（不登录 Pilke） |
| `npm run poll` | 检查一次新消息 |
| `npm start` | 按 `POLL_INTERVAL_HOURS` 持续轮询（默认 8 小时） |
| `npm run notify-all [N]` | 重新推送最近 N 条（或不带参数推送全部） |
| `npm run auth` | 交互式浏览器登录，保存 `data/session.json` |
| `npm run check-notification-config` | 校验已选通知渠道的环境变量 |

**首次 `poll` / Actions 运行：** 会把当前收件箱标为已读，并发送初始化确认。之后只通知更新的消息。

---

## 可选配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POLL_INTERVAL_HOURS` | `8` | 本地 `npm start` 的轮询间隔 |
| `INITIAL_SYNC_MODE` | `mark-seen` | 首次运行：标记现有消息为已读 |
| `MESSAGES_URL` | 空 | 自动导航失败时填写收件箱直达 URL |
| `DEBUG_CAPTURE` | `0` | 设为 `1` 时在 `data/debug/` 保存 HTML / 截图 |
| `MESSAGE_*_SELECTOR` | 空 | Pilke 页面改版时可覆盖 CSS 选择器 |

完整列表见 [`.env.example`](.env.example)。

---

## 免责声明

本项目仅供个人学习与技术研究。使用自动化方式访问 Pilke 可能违反其服务条款。**所有风险由使用者自行承担。**

---

## 许可证

[MIT](LICENSE)
