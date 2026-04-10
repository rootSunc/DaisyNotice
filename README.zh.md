# DaisyNotice

> 🔔 Pilke 消息监控与多渠道通知工具

**[English Version](README.md)** 

---

## 项目介绍

DaisyNotice 是一个轻量级 Node.js 后台服务，自动监控你在 Pilke DaisyFamily 的消息收件箱，并实时推送新消息到 Telegram 或企业微信。

**痛点解决：** Pilke DaisyFamily 平台缺乏实时通知能力且无法通知多个用户，容易遗漏重要消息。DaisyNotice 帮你和家人及时获取最新消息。

---

## 核心特性

- ✅ **自动化监控** — 通过 Playwright 浏览器自动化定期轮询
- ✅ **无重复通知** — 本地 JSON 记录已读消息，智能去重
- ✅ **多渠道推送** — 同时支持 Telegram 和企业微信
- ✅ **无需云服务** — 零依赖，本地运行，数据完全掌控
- ✅ **高度可定制** — 支持自定义 CSS 选择器、轮询间隔等
- ✅ **会话持久化** — 首次手动登录，之后自动使用保存的会话

---

## 快速开始

### 前置要求

- Node.js 16+
- npm 或 yarn

### 安装步骤

**1. 克隆项目**
```bash
git clone <repo-url>
cd DaisyNotice
npm install
npx playwright install chromium
```

**2. 配置通知渠道**

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env`，至少配置下列之一：
- **Telegram**: `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`
- **企业微信**: `WECHAT_WEBHOOK_URL`

**3. 首次登录**
```bash
npm run auth
```
- 浏览器会自动打开 Pilke 登录页面
- 手动输入账号密码登录
- 登录成功后，在终端按 Enter 键
- 会话自动保存到 `data/session.json`

**4. 测试**
```bash
npm run poll
```
如果收到测试通知，说明配置成功！

**5. 后台运行**
```bash
npm start
```

---

## 故障排除

| 问题 | 解决方案 |
|------|--------|
| 登录失败 | 检查网络，确认账号有效 |
| 无法收到通知 | 检查通知渠道配置，运行 `npm run poll` 测试 |
| 重复收到消息 | 删除 `data/state.json`，重新运行初始同步 |
| 消息解析错误 | 检查网站 HTML 结构是否改变，调整 CSS 选择器 |

---

## 许可证

MIT — 见 [LICENSE](LICENSE) 文件。

---

## 免责声明

本项目仅供个人学习与技术研究使用。使用本项目脚本访问 Pilke 平台可能违反其服务条款。作者不对因使用此工具导致的不良后果负责：**使用前请仔细阅读相关服务条款，所有风险由用户自行承担。**
