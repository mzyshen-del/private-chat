const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT) || 3000;
const MAX_ROOMS = 1000;
const rooms = new Map();
const sendTimes = new WeakMap();
const creationTimes = new WeakMap();

function reply(done, result) {
  if (typeof done === 'function') done(result);
}
function roomIdFor(accessKey) {
  return 'room-' + crypto.createHash('sha256').update(accessKey).digest('hex').slice(0, 32);
}
function validInvite(roomId, accessKey) {
  if (!/^room-[a-f0-9]{32}$/.test(roomId) ||
      typeof accessKey !== 'string' || !/^[a-f0-9]{64}$/.test(accessKey)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(roomId.slice(5), 'hex'),
    Buffer.from(roomIdFor(accessKey).slice(5), 'hex')
  );
}
function roomFor(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    if (rooms.size >= MAX_ROOMS) return null;
    room = { messages: [], updatedAt: Date.now() };
    rooms.set(roomId, room);
  }
  return room;
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', socket => {
  socket.on('create_room', done => {
    const now = Date.now();
    const recent = (creationTimes.get(socket) || []).filter(time => now - time < 60000);
    if (recent.length >= 3) return reply(done, { ok: false, error: '创建太频繁，请稍后再试' });
    const accessKey = crypto.randomBytes(32).toString('hex');
    const roomId = roomIdFor(accessKey);
    if (!roomFor(roomId)) return reply(done, { ok: false, error: '房间数量已达上限' });
    recent.push(now);
    creationTimes.set(socket, recent);
    if (socket.data.roomId) socket.leave(socket.data.roomId);
    socket.data.roomId = undefined;
    socket.data.userName = undefined;
    reply(done, { ok: true, roomId, accessKey });
  });

  socket.on('join_room', (payload, done) => {
    const roomId = String(payload?.roomId || '').trim().toLowerCase();
    const userName = String(payload?.userName || '').trim();
    if (!userName || userName.length > 24) {
      return reply(done, { ok: false, error: '昵称应为 1–24 字' });
    }
    if (!validInvite(roomId, payload?.accessKey)) {
      return reply(done, { ok: false, error: '邀请链接无效' });
    }
    const room = roomFor(roomId);
    if (!room) return reply(done, { ok: false, error: '房间数量已达上限' });
    if (socket.data.roomId) socket.leave(socket.data.roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;
    socket.join(roomId);
    room.updatedAt = Date.now();
    reply(done, { ok: true, history: room.messages.slice(-300) });
    socket.to(roomId).emit('system', { text: userName + ' 加入了聊天', time: new Date().toISOString() });
  });

  socket.on('send_message', (payload, done) => {
    const roomId = socket.data.roomId;
    const content = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!roomId || !socket.data.userName) return reply(done, { ok: false, error: '未加入房间' });
    if (!content || content.length > 2000) return reply(done, { ok: false, error: '消息应为 1–2000 字' });
    const now = Date.now();
    const recent = (sendTimes.get(socket) || []).filter(time => now - time < 10000);
    if (recent.length >= 5) return reply(done, { ok: false, error: '发送太频繁，请稍后再试' });
    recent.push(now);
    sendTimes.set(socket, recent);
    const room = rooms.get(roomId);
    if (!room) return reply(done, { ok: false, error: '房间暂时不可用，请重新进入' });
    const message = { id: crypto.randomUUID(), roomId, from: socket.data.userName, text: content, time: new Date().toISOString() };
    room.messages.push(message);
    room.messages = room.messages.slice(-1000);
    room.updatedAt = now;
    io.to(roomId).emit('message', message);
    reply(done, { ok: true });
  });
});

if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log('Chat server running on port ' + PORT));
module.exports = { server, io, app, rooms, validInvite };
