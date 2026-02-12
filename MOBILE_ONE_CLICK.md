# 手机一键打开（免安装）

你要的效果需要把聊天服务部署到云端，得到一个固定公网链接。
链接打开即聊，手机端无需安装任何 App。

## 最快方案：Railway（推荐）

1. 把当前项目上传到 GitHub 仓库。
2. 打开 Railway：`https://railway.app/new`
3. 选择 `Deploy from GitHub repo`，选你的仓库。
4. Railway 自动识别 `railway.json`，部署完成后会生成 `https://xxx.up.railway.app`
5. 把这个链接直接发给聊天对象即可。

## 说明

- 聊天记录会保存在服务端 `chat-data.json`。
- 这个文件在 Railway 容器重建时可能丢失（临时磁盘）。
- 如果你要长期永久保存，我可以下一步帮你改成 SQLite/Postgres（云端持久化）。
## 分享给聊天对象

部署后先打开主页，例如：
`https://your-app.up.railway.app`

在页面中输入房间号（例如 `vip-2026`），然后点击“复制邀请链接”。
会得到：
`https://your-app.up.railway.app/?room=vip-2026`

把这个链接发给对方，对方在手机浏览器点开就能直接进入同一房间聊天。
