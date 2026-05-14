const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;
const ROOM_HISTORY_LIMIT = 200;
const roomHistory = [];

app.use(express.static(path.join(__dirname)));

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.emit('roomHistory', roomHistory);

  socket.on('chatMessage', message => {
    if (!message || typeof message !== 'object' || !message.text) return;

    const chatMessage = {
      senderId: String(message.senderId || 'guest'),
      senderLabel: String(message.senderLabel || 'Guest'),
      text: String(message.text).trim().slice(0, 1000),
      timestamp: new Date().toISOString(),
    };

    roomHistory.push(chatMessage);
    if (roomHistory.length > ROOM_HISTORY_LIMIT) {
      roomHistory.shift();
    }

    io.emit('roomMessage', chatMessage);
  });

  socket.on('disconnect', reason => {
    console.log('Client disconnected:', socket.id, reason);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
