const { Mutex } = require('async-mutex');
const questionGenerator = require('../questionGenerator');
const userService = require('./userService');

const COOLDOWN_MS = 5000;

class GameManager {
  constructor(io) {
    this.io = io;
    this.mutex = new Mutex();
    this.currentQuestion = null;
    this.isActive = false;
    this.players = new Map();
    this.scores = new Map();
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

      // Update in-memory scores
      const memEntry = this.scores.get(player.userId) || { userId: player.userId, username: player.username, score: 0, wins: 0, gamesPlayed: 0 };
      memEntry.score += scoreGain;
      memEntry.wins += 1;
      memEntry.gamesPlayed += 1;
      this.scores.set(player.userId, memEntry);

      const otherUserIds = [];
      for (const [id, p] of this.players) {
        if (id !== socket.id) {
          const other = this.scores.get(p.userId);
          if (other) other.gamesPlayed += 1;
          otherUserIds.push(p.userId);
        }
      }

      // Persist to DB via userService
      try {
        await userService.incrementWin(player.userId, scoreGain);
        await userService.incrementGamesPlayed(otherUserIds);
      } catch (err) {
        console.error('DB update failed (using in-memory scores):', err.message);
      }

      // Build leaderboard
      let leaderboard;
      try {
        leaderboard = await userService.getLeaderboard();
      } catch {
        leaderboard = null;
      }
      if (!leaderboard) {
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
