require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim());

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mathquiz';
const PORT = process.env.PORT || 4000;

let dbConnected = false;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    dbConnected = true;
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.warn('MongoDB connection failed — running without persistence:', err.message);
    console.warn('Leaderboard and score persistence will be unavailable.');
  });

const gameManager = new GameManager(io);

// --- REST endpoints ---

app.get('/api/leaderboard', async (_req, res) => {
  try {
    if (!dbConnected) return res.json(gameManager.getInMemoryLeaderboard());
    const users = await User.find().sort({ score: -1 }).limit(10).lean();
    res.json(users);
  } catch (err) {
    res.json(gameManager.getInMemoryLeaderboard());
  }
});

app.post('/api/register', async (req, res) => {
  const { username, userId: existingId } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const trimmed = username.trim().substring(0, 20);

  if (!dbConnected) {
    const id = existingId || crypto.randomUUID();
    return res.json({ userId: id, username: trimmed, score: 0, wins: 0 });
  }

  try {
    // Returning user — look up by userId
    if (existingId) {
      let user = await User.findOne({ userId: existingId });
      if (user) {
        if (user.username !== trimmed) {
          user.username = trimmed;
          await user.save();
        }
        return res.json({ userId: user.userId, username: user.username, score: user.score, wins: user.wins });
      }
    }

    // New user — generate a fresh userId
    const userId = crypto.randomUUID();
    const user = await User.create({ userId, username: trimmed });
    res.json({ userId: user.userId, username: user.username, score: user.score, wins: user.wins });
  } catch (err) {
    const id = existingId || crypto.randomUUID();
    res.json({ userId: id, username: trimmed, score: 0, wins: 0 });
  }
});

// --- Socket.IO ---

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join', async ({ userId, username }) => {
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  gameManager.startNewRound();
});
