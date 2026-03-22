require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const GameManager = require('./services/gameService');
const userController = require('./controllers/userController');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors());
app.use(express.json());

// --- Database ---

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.warn('MongoDB connection failed — running without persistence:', err.message);
  });

// --- Game manager ---

const gameManager = new GameManager(io);
userController.init(gameManager);

// --- REST routes ---

app.use('/api', apiRoutes);

// --- Socket.IO ---

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join', ({ userId, username }) => {
    gameManager.addPlayer(socket, username, userId);

    if (gameManager.currentQuestion) {
      socket.emit('new-question', {
        id: gameManager.currentQuestion.id,
        expression: gameManager.currentQuestion.expression,
        difficulty: gameManager.currentQuestion.difficulty,
      });
    }

    io.emit('player-count', gameManager.getPlayerCount());
  });

  socket.on('submit-answer', (data) => {
    gameManager.processAnswer(socket, data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameManager.removePlayer(socket.id);
    io.emit('player-count', gameManager.getPlayerCount());
  });
});

// --- Start ---

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  gameManager.startNewRound();
});
