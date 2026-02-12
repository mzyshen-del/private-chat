# One-Click Online

## 1. 一键启动
双击 `deploy-online.bat`

脚本会自动做这几件事：
- 检查 `node` / `npm`
- 执行 `npm install`
- 自动下载 `cloudflared.exe`（首次）
- 启动聊天服务 `server.js`
- 生成一个公网链接（`https://xxxx.trycloudflare.com`）

把这个公网链接发给聊天对象，对方打开即可进入聊天。

## 2. 聊天记录存储
聊天记录会写入项目根目录的 `chat-data.json`。

## 3. 注意
- 你的电脑需要保持开机，且脚本窗口不要关闭。
- 如果关闭窗口或断网，公网链接会失效。
- 重新一键启动会生成新的临时公网链接。
