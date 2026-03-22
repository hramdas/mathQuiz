const { Mutex } = require('async-mutex');
const mongoose = require('mongoose');
const questionGenerator = require('./questionGenerator');
const User = require('./models/User');

const COOLDOWN_MS = 5000;

class GameManager {
  constructor(io) {
    this.io = io;
    this.mutex = new Mutex();
    this.currentQuestion = null;
    this.isActive = false;
    this.players = new Map(); // socketId -> { userId, username, socket }
    this.scores = new Map(); // userId -> { userId, username, score, wins, gamesPlayed } (in-memory fallback)
  }

  get dbAvailable() {
    return mongoose.connection.readyState === 1;
  }

  addPlayer(socket, username, userId) {
    this.players.set(socket.id, { userId, username, socket });
    if (!this.scores.has(userId)) {
      this.scores.set(userId, { userId, username, score: 0, wins: 0, gamesPlayed: 0 });
    } else {
      this.scores.get(userId).username = username;
    }
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  getInMemoryLeaderboard() {
    return [...this.scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  startNewRound() {
    this.currentQuestion = questionGenerator.generate();
    this.isActive = true;

    this.io.emit('new-question', {
      id: this.currentQuestion.id,
      expression: this.currentQuestion.expression,
      difficulty: this.currentQuestion.difficulty,
    });

    console.log(
      `New round: "${this.currentQuestion.expression}" = ${this.currentQuestion.answer} [${this.currentQuestion.difficulty}]`
    );
  }

  async processAnswer(socket, { questionId, answer }) {
    const release = await this.mutex.acquire();

    try {
      if (!this.isActive || !this.currentQuestion) return;
      if (questionId !== this.currentQuestion.id) return;

      const player = this.players.get(socket.id);
      if (!player) return;

      const numAnswer = Number(answer);
      if (isNaN(numAnswer)) {
        socket.emit('answer-result', { correct: false, message: 'Invalid number' });
        return;
      }

      if (numAnswer !== this.currentQuestion.answer) {
        socket.emit('answer-result', { correct: false, message: 'Wrong answer, try again!' });
        return;
      }

      this.isActive = false;

      const scoreGain = this.currentQuestion.difficulty === 'easy' ? 10
        : this.currentQuestion.difficulty === 'medium' ? 20
        : 30;

      // Update in-memory scores (always available)
      const memEntry = this.scores.get(player.userId) || { userId: player.userId, username: player.username, score: 0, wins: 0, gamesPlayed: 0 };
      memEntry.score += scoreGain;
      memEntry.wins += 1;
      memEntry.gamesPlayed += 1;
      this.scores.set(player.userId, memEntry);

      for (const [id, p] of this.players) {
        if (id !== socket.id) {
          const other = this.scores.get(p.userId);
          if (other) other.gamesPlayed += 1;
        }
      }

      // Persist to DB if available
      if (this.dbAvailable) {
        try {
          await User.findOneAndUpdate(
            { userId: player.userId },
            { $inc: { score: scoreGain, wins: 1, gamesPlayed: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
          );

          const otherUserIds = [];
          for (const [id, p] of this.players) {
            if (id !== socket.id) otherUserIds.push(p.userId);
          }
          if (otherUserIds.length > 0) {
            await User.updateMany(
              { userId: { $in: otherUserIds } },
              { $inc: { gamesPlayed: 1 } }
            );
          }
        } catch (err) {
          console.error('DB update failed (using in-memory scores):', err.message);
        }
      }

      // Build leaderboard
      let leaderboard;
      if (this.dbAvailable) {
        try {
          leaderboard = await User.find().sort({ score: -1 }).limit(10).lean();
        } catch {
          leaderboard = this.getInMemoryLeaderboard();
        }
      } else {
        leaderboard = this.getInMemoryLeaderboard();
      }

      socket.emit('answer-result', { correct: true, message: 'You won this round!' });

      this.io.emit('round-result', {
        winner: player.username,
        answer: this.currentQuestion.answer,
        expression: this.currentQuestion.expression,
        scoreGain,
      });

      this.io.emit('leaderboard-update', leaderboard);

      setTimeout(() => this.startNewRound(), COOLDOWN_MS);
    } finally {
      release();
    }
  }
}

module.exports = GameManager;
