# 部署与双设备验收

## 当前服务

- 在线地址：https://private-chat-demo-b68g.onrender.com
- Render：Free Web Service，Blueprint 管理；线上已包含手机端邀请链接输入修复。
- 2026-10-21 已从公网验证：首页和 `/health` 返回 200；远程 WebSocket 建房、错误邀请拒绝、两端收发、切换房间隔离与重连通过。
- 项目负责人已确认电脑和手机端均可正常使用。

`render.yaml` 固定了构建、启动和健康检查。Blueprint 将自动部署设为 `off`，以后推送新代码不会自动更新线上服务；需要在 Render 的服务页面使用 **Manual Deploy**，并核对部署提交。

## 电脑与手机验收

1. 电脑打开在线地址，填写昵称、创建房间、进入聊天并复制**完整**邀请链接。
2. 手机打开链接，填写另一个昵称并进入；双方各发送一条**虚构**消息，确认两边都显示。
3. 电脑再创建第二个房间，确认不会收到原房间后续消息。
4. 手机短暂断网再联网，确认恢复连接后仍能聊天。
5. 服务休眠或重启会清空旧消息，但原完整邀请链接仍可重新进入房间。

Render 免费服务闲置后会休眠，首次唤醒可能需要约一分钟；这不是账号登录故障。[官方限制说明](https://render.com/docs/free)

## 本地验证

```powershell
npm ci
npm test
npm start
```

访问 `http://localhost:3000/health` 可检查本地服务。Dockerfile 也可用于其他支持 WebSocket 的容器平台。Windows 临时隧道脚本 `deploy-online.bat` 仅用于临时分享，生成的网址不固定。
