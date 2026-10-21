# Invite Link Chat Demo

一个基于 Express 和 Socket.IO 的实时聊天室演示。填写昵称、创建房间、复制邀请链接；对方打开链接后填写昵称即可进入同一房间。

**在线演示：** https://private-chat-demo-b68g.onrender.com

> 这是作品集演示，不提供账号密码登录、端到端加密或实名身份验证。请勿传输敏感信息。

## 功能

- 加密随机数生成邀请凭证；房间号由凭证派生，服务重启后原链接仍可加入。
- 房间切换时退出原房间；断线重连后浏览器尝试重新加入。
- 消息长度最多 2000 字，每个连接 10 秒最多发送 5 条。
- 服务运行期间每个房间保留最多 1000 条消息，加入时显示最近 300 条；**服务休眠、重启或重新部署后，所有消息清空**。
- 页面转义消息文字，避免把它当作 HTML 执行。

## 本地运行

建议使用 Node.js 24；Render 版本由 `.node-version` 固定。

```powershell
npm ci
npm start
```

打开 `http://localhost:3000`。一方填写昵称并点击“创建房间”“进入聊天”，复制完整邀请链接；另一方在不同浏览器或手机打开链接，填写昵称并点击“进入聊天”。

```powershell
npm test
```

自动化测试覆盖错误凭证、历史记录、房间隔离、断线重连、服务重启后重新进入，以及消息限制。

## 固定网址演示

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mzyshen-del/private-chat)

本仓库的 `render.yaml` 为 Render 免费 Web Service 配置了 Node 运行环境和 `/health` 健康检查。当前演示地址为 https://private-chat-demo-b68g.onrender.com 。免费服务在闲置后会休眠，首次重新访问需要等待唤醒；内存中的消息会清空，邀请链接仍可重新进入房间。2026-10-21 已在线验证：首页与健康检查返回 200，建房、错误凭证拒绝、两端收发、房间隔离与重连通过。电脑及手机上的界面体验需另行人工验收。详见 [部署与双设备验收](DEPLOY.md) 和 [Render 免费服务限制](https://render.com/docs/free)。

## 访问与隐私边界

任何持有**完整邀请链接**的人都可以进入对应房间并读取该次运行期间的历史消息。链接中的凭证位于 URL 片段（`#` 后），不会随页面 HTTP 请求发送；浏览器会通过 Socket.IO 将凭证交给应用服务端验证。不要公开邀请链接，也不要用真实私人内容测试。

消息只保存在单个服务进程的内存中，不写入磁盘或 Git。当前方案适合演示，不支持长期保存或多实例共享。若后续需要正式服务，应另外设计持久化存储、账号认证和共享限流。
