# 部署与演示

## 本地运行

```powershell
npm ci
npm start
```

访问 `http://localhost:3000/health` 可检查服务。运行 `npm test` 执行 Socket.IO 流程测试。

## Windows 临时公网演示

双击 `deploy-online.bat`，或运行：

```powershell
.\deploy-online.ps1 -Port 3000
```

脚本检查 Node.js 和 npm、执行 `npm ci`、首次下载 Cloudflare cloudflared、启动本地服务，并生成临时 `trycloudflare.com` 链接。电脑、脚本和隧道必须保持运行；重启后链接会改变。此方式只适合短时演示。

## 容器部署

```powershell
docker build -t invite-link-chat .
docker run --rm -p 3000:3000 invite-link-chat
```

容器平台需要支持 WebSocket。应用监听平台提供的 `PORT` 环境变量。当前记录保存在 `chat-data.json`，容器临时磁盘重建后可能丢失；如需长期保存，请挂载持久化目录并设置 `CHAT_DATA_FILE`，或改用数据库。多实例部署不能共用当前 JSON 存储。

部署时不要把 `chat-data.json`、邀请链接或其他真实聊天资料提交到 Git。此项目没有端到端加密，也没有账号身份验证；公开演示请使用虚构内容。
