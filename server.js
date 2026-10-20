const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.CHAT_DATA_FILE || path.join(__dirname, 'chat-data.json');
const sendTimes = new WeakMap();
const creationTimes = new WeakMap();

function loadStore() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!data || !data.rooms || typeof data.rooms !== 'object' || Array.isArray(data.rooms)) throw new Error('Invalid chat store');
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return { rooms: {} };
    throw error;
  }
}
function saveStore(store) {
  const temp = DATA_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DATA_FILE);
}
function reply(done, result) {
  if (typeof done === 'function') done(result);
}
function hash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
function allowed(room, key) {
  if (!room || typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key) ||
      !/^[a-f0-9]{64}$/.test(room.accessKeyHash || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(hash(key), 'hex'), Buffer.from(room.accessKeyHash, 'hex'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', socket => {
  socket.on('create_room', done => {
    try {
      const now = Date.now();
      const recent = (creationTimes.get(socket) || []).filter(time => now - time < 60000);
      if (recent.length >= 3) return reply(done, { ok: false, error: '创建太频繁，请稍后再试' });
      const store = loadStore();
      if (Object.keys(store.rooms).length >= 1000) return reply(done, { ok: false, error: '房间数量已达上限' });
      let roomId;
      do { roomId = 'room-' + crypto.randomBytes(8).toString('hex'); }
      while (Object.hasOwn(store.rooms, roomId));
      const accessKey = crypto.randomBytes(32).toString('hex');
      store.rooms[roomId] = { accessKeyHash: hash(accessKey), messages: [], updatedAt: new Date().toISOString() };
      saveStore(store);
      recent.push(now);
      creationTimes.set(socket, recent);
      if (socket.data.roomId) socket.leave(socket.data.roomId);
      socket.data.roomId = undefined;
      socket.data.userName = undefined;
      reply(done, { ok: true, roomId, accessKey });
    } catch (error) {
      console.error('create_room failed:', error);
      reply(done, { ok: false, error: '创建房间失败' });
    }
  });

  socket.on('join_room', (payload, done) => {
    const roomId = String(payload?.roomId || '').trim().toLowerCase();
    const userName = String(payload?.userName || '').trim();
    if (!/^room-[a-f0-9]{16}$/.test(roomId) || !userName || userName.length > 24) {
      return reply(done, { ok: false, error: '房间号或昵称无效' });
    }
    try {
      const room = loadStore().rooms[roomId];
      if (!allowed(room, payload?.accessKey)) {
        return reply(done, { ok: false, error: '邀请链接无效或房间不存在' });
      }
      if (socket.data.roomId) socket.leave(socket.data.roomId);
      socket.data.roomId = roomId;
      socket.data.userName = userName;
      socket.join(roomId);
      reply(done, { ok: true, history: room.messages.slice(-300) });
      socket.to(roomId).emit('system', { text: userName + ' 加入了聊天', time: new Date().toISOString() });
    } catch (error) {
      console.error('join_room failed:', error);
      reply(done, { ok: false, error: '加入房间失败' });
    }
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
    try {
      const store = loadStore();
      const room = store.rooms[roomId];
      if (!room?.accessKeyHash) return reply(done, { ok: false, error: '房间不可用' });
      const message = { id: crypto.randomUUID(), roomId, from: socket.data.userName, text: content, time: new Date().toISOString() };
      room.messages.push(message);
      room.messages = room.messages.slice(-1000);
      room.updatedAt = message.time;
      saveStore(store);
      io.to(roomId).emit('message', message);
      reply(done, { ok: true });
    } catch (error) {
      console.error('send_message failed:', error);
      reply(done, { ok: false, error: '发送失败，请稍后重试' });
    }
  });
});

if (require.main === module) server.listen(PORT, () => console.log('Chat server running on http://localhost:' + PORT));
module.exports = { server, io, app, loadStore };
