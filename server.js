const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "chat-data.json");

function loadStore() {
  if (!fs.existsSync(DATA_FILE)) return { rooms: {} };
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.rooms || typeof parsed.rooms !== "object") return { rooms: {} };
    return parsed;
  } catch (_err) {
    return { rooms: {} };
  }
}

function saveStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function ensureRoom(store, roomId) {
  if (!store.rooms[roomId]) {
    store.rooms[roomId] = {
      messages: [],
      updatedAt: new Date().toISOString()
    };
  }
  return store.rooms[roomId];
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, userName }, done) => {
    const room = String(roomId || "").trim().toLowerCase();
    const user = String(userName || "").trim();
    if (!room || !user) {
      done?.({ ok: false, error: "roomId 和 userName 不能为空" });
      return;
    }

    socket.data.roomId = room;
    socket.data.userName = user;
    socket.join(room);

    const store = loadStore();
    const currentRoom = ensureRoom(store, room);
    done?.({ ok: true, history: currentRoom.messages.slice(-300) });

    socket.to(room).emit("system", {
      text: `${user} 加入了聊天`,
      time: new Date().toISOString()
    });
  });

  socket.on("send_message", ({ text }, done) => {
    const room = socket.data.roomId;
    const user = socket.data.userName;
    const content = String(text || "").trim();

    if (!room || !user) {
      done?.({ ok: false, error: "未加入房间" });
      return;
    }

    if (!content) {
      done?.({ ok: false, error: "消息不能为空" });
      return;
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      roomId: room,
      from: user,
      text: content,
      time: new Date().toISOString()
    };

    const store = loadStore();
    const currentRoom = ensureRoom(store, room);
    currentRoom.messages.push(message);
    if (currentRoom.messages.length > 1000) {
      currentRoom.messages = currentRoom.messages.slice(-1000);
    }
    currentRoom.updatedAt = message.time;
    saveStore(store);

    io.to(room).emit("message", message);
    done?.({ ok: true });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
