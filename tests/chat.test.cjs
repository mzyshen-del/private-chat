const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { io: clientIo } = require('socket.io-client');

test('room access, history, isolation, reconnect and message limits', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-chat-'));
  process.env.CHAT_DATA_FILE = path.join(dir, 'chat-data.json');
  const { server, io } = require('../server');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const clients = [];
  const connect = () => new Promise((resolve, reject) => {
    const socket = clientIo(url, { transports: ['websocket'], reconnection: false });
    clients.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
  const ack = (socket, event, payload) => new Promise(resolve => {
    const callback = (error, result) => resolve(error ? { ok: false, error } : result);
    if (payload === undefined) socket.timeout(2000).emit(event, callback);
    else socket.timeout(2000).emit(event, payload, callback);
  });
  try {
    const alice = await connect();
    const bob = await connect();
    const room1 = await ack(alice, 'create_room');
    assert.equal(room1.ok, true);
    assert.match(room1.roomId, /^room-[a-f0-9]{16}$/);
    assert.equal(room1.accessKey.length, 64);
    assert.equal((await ack(bob, 'join_room', { roomId: room1.roomId, userName: 'Bob', accessKey: '0'.repeat(64) })).ok, false);
    assert.equal((await ack(alice, 'join_room', { roomId: room1.roomId, userName: 'Alice', accessKey: room1.accessKey })).ok, true);
    assert.equal((await ack(bob, 'join_room', { roomId: room1.roomId, userName: 'Bob', accessKey: room1.accessKey })).ok, true);
    assert.equal((await ack(alice, 'send_message', { text: 'hello' })).ok, true);
    const history = await ack(bob, 'join_room', { roomId: room1.roomId, userName: 'Bob', accessKey: room1.accessKey });
    assert.equal(history.history.at(-1).text, 'hello');
    assert.equal((await ack(alice, 'send_message', { text: 'x'.repeat(2001) })).ok, false);

    const room2 = await ack(alice, 'create_room');
    assert.equal((await ack(alice, 'join_room', { roomId: room2.roomId, userName: 'Alice', accessKey: room2.accessKey })).ok, true);
    let leaked = false;
    alice.on('message', message => { if (message.text === 'old-room') leaked = true; });
    assert.equal((await ack(bob, 'send_message', { text: 'old-room' })).ok, true);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(leaked, false);

    alice.disconnect();
    alice.connect();
    await new Promise(resolve => alice.once('connect', resolve));
    const rejoined = await ack(alice, 'join_room', { roomId: room2.roomId, userName: 'Alice', accessKey: room2.accessKey });
    assert.equal(rejoined.ok, true);
    const carol = await connect();
    assert.equal((await ack(carol, 'join_room', { roomId: room2.roomId, userName: 'Carol', accessKey: room2.accessKey })).ok, true);
    const received = new Promise(resolve => alice.once('message', resolve));
    assert.equal((await ack(carol, 'send_message', { text: 'after reconnect' })).ok, true);
    assert.equal((await received).text, 'after reconnect');
    for (let i = 0; i < 4; i++) assert.equal((await ack(carol, 'send_message', { text: 'rate ' + i })).ok, true);
    assert.equal((await ack(carol, 'send_message', { text: 'rate limit' })).ok, false);
    const stored = JSON.parse(fs.readFileSync(process.env.CHAT_DATA_FILE, 'utf8'));
    assert.notEqual(stored.rooms[room1.roomId].accessKeyHash, room1.accessKey);
  } finally {
    clients.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


