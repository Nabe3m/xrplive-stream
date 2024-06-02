const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('message', (message) => {
    console.log('Received message:', message); // メッセージの内容をログに出力
    io.emit('message', message); // メッセージを全クライアントにブロードキャスト
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});
