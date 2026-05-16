# DaisyNotice

> 🔔 Pilke 消息监控与多渠道通知工具

**[English Version](README.md)** 

---

## 项目介绍

DaisyNotice 是一个轻量级 Node.js 后台服务，自动监控你在 Pilke DaisyFamily 的消息收件箱，并实时推送新消息到 Telegram、企业微信或邮箱。

**痛点解决：** Pilke DaisyFamily 平台缺乏实时通知能力且无法通知多个用户，容易遗漏重要消息。DaisyNotice 帮你和家人及时获取最新消息。

---

## 核心特性

- ✅ **自动化监控** — 通过 Playwright 浏览器自动化定期轮询
- ✅ **无重复通知** — 本地 JSON 记录已读消息，智能去重
- ✅ **多渠道推送** — 同时支持 Telegram、企业微信和邮件
- ✅ **无需云服务** — 零依赖，本地运行，数据完全掌控
- ✅ **高度可定制** — 支持自定义 CSS 选择器、轮询间隔等
- ✅ **智能去重** — 基于时间戳的消息追踪机制

---

## 前置要求

- Node.js 24+
- npm 或 yarn

---

## 通知配置

通过 `NOTIFICATION_CHANNELS` 选择推送渠道，多个渠道用英文逗号分隔：

```env
NOTIFICATION_CHANNELS=telegram,email
```

支持的值：

- `telegram` — Telegram Bot
- `wechat` — 企业微信机器人 Webhook
- `email` — SMTP 邮件
- `both` — Telegram + 企业微信
- `all` — Telegram + 企业微信 + 邮件

邮件推送需要配置 SMTP 发件账号。收件邮箱不需要密码，`EMAIL_TO` 可填写多个邮箱地址：

```env
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_FAMILY=4
EMAIL_SMTP_USER=notice@example.com
EMAIL_SMTP_PASS=your-app-password
EMAIL_FROM=notice@example.com
EMAIL_TO=person1@example.com,person2@example.com
```

如果在 GitHub Actions 中运行，把以上变量保存到仓库的 GitHub Secrets 即可。

---

## 命令指南

| 命令 | 执行方式 | 用途 | 使用场景 |
|------|----------|------|---------|
| `npm run auth` | 一次性 | 浏览器登录 Pilke 并保存会话 | 首次设置、会话过期 |
| `npm run poll` | 一次性 | 检查一次新消息 | 手动测试、开发调试、临时查询 |
| `npm run notify-all [N]` | 一次性 | 重新推送消息（最新 N 条或全部） | 重新通知特定消息、测试 |
| `npm start` | 持续运行 | 自动监控并定时推送消息 | 生产环境、24/7 监控 |

### 命令详情

#### `npm run auth`
- **首次使用** — 登录 Pilke 并保存会话
- 将会话保存到 `data/session.json` 供后续使用
- 仅在会话过期时重新运行

#### `npm run poll`
- 运行 **一次** 后退出
- **首次运行**：标记所有现有消息为已读（不发送通知）
- **后续运行**：仅推送新消息
- 最适合：测试、调试、手动检查

#### `npm run notify-all [N]`
- 运行 **一次** 后退出
- `npm run notify-all 5` — 重新推送最后 5 条消息（从旧到新）
- `npm run notify-all` — 重新推送所有消息
- 消息按时间顺序排序（从旧到新）发送
- 最适合：测试、重新通知特定消息、演示

#### `npm run notify-test`
- 运行 **一次** 后退出
- 发送一条 DaisyNotice 测试通知，不登录 Pilke、不读取消息
- 最适合：验证 Telegram、邮件等通知配置是否正确
- 在 GitHub Actions 手动运行 `DaisyNotice Poll` 时，勾选 `send_test_notification` 可触发同样的测试

#### `npm start`
- **持续运行** 在后台
- 每 `POLL_INTERVAL_HOURS` 小时自动执行一次检查（默认：8 小时）
- 按 Ctrl+C 停止
- 最适合：生产环境、24/7 监控

---

## 免责声明

本项目仅供个人学习与技术研究使用。使用本项目脚本访问 Pilke 平台可能违反其服务条款。作者不对因使用此工具导致的不良后果负责：**使用前请仔细阅读相关服务条款，所有风险由用户自行承担。**

---

## 许可证

MIT [LICENSE](LICENSE)
