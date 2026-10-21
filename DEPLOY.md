# 部署与双设备验收

## 我负责的准备工作

代码已提供 `render.yaml`：Node Web Service、免费计划、`npm ci --omit=dev` 构建、`npm start` 启动和 `/health` 检查。消息只保存在内存；休眠后可用原邀请链接重新进入，但旧消息不会保留。

## 你需要在 Render 完成的步骤

1. 注册并登录 [Render](https://dashboard.render.com/)。
2. 打开 README 中的“Deploy to Render”按钮，确认仓库为 `mzyshen-del/private-chat`，服务类型为 **Web Service**、计划为 **Free**；确认页面不附加付费数据库或磁盘。
3. 批准创建服务，等待状态变为 **Live**。把生成的 `https://…onrender.com` 地址发给我；不必发送账号密码或 API 密钥。

Render 免费 Web Service 支持 WebSocket，但闲置 15 分钟后会休眠，首次唤醒约需一分钟；休眠、重启或部署会清空内存消息。[官方限制说明](https://render.com/docs/free)

## 上线后验收

我会先检查固定网址、`/health`、页面加载和远程 Socket.IO 的创建、加入、收发、隔离及重连。你随后用自己的电脑和手机完成界面验收：

1. 电脑打开固定网址，填昵称、创建房间、进入聊天并复制完整邀请链接。
2. 手机打开该链接，填另一个昵称并进入；双方各发送一条**虚构**消息，确认两边都显示。
3. 电脑再创建第二个房间，确认不会收到原房间后续消息。
4. 手机短暂断网再联网，确认恢复连接后能继续聊天。
5. 服务闲置或重启后，旧消息清空；原完整邀请链接仍应能进入房间。

## 本地与容器

```powershell
npm ci
npm test
npm start
```

访问 `http://localhost:3000/health` 可检查本地服务。Dockerfile 也可用于其他支持 WebSocket 的容器平台。Windows 临时隧道脚本 `deploy-online.bat` 仅用于临时分享，生成的网址不固定。
