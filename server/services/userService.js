const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function findByUserId(userId) {
  if (!isDbConnected()) return null;
  return User.findOne({ userId }).lean();
}

async function createUser(username) {
  const userId = crypto.randomUUID();
  if (!isDbConnected()) {
    return { userId, username, score: 0, wins: 0, gamesPlayed: 0 };
  }
  const user = await User.create({ userId, username });
  return { userId: user.userId, username: user.username, score: user.score, wins: user.wins };
}

async function updateUsername(userId, newUsername) {
  if (!isDbConnected()) return;
  await User.updateOne({ userId }, { $set: { username: newUsername } });
}

async function incrementWin(userId, scoreGain) {
  if (!isDbConnected()) return;
  await User.findOneAndUpdate(
    { userId },
    { $inc: { score: scoreGain, wins: 1, gamesPlayed: 1 } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

async function incrementGamesPlayed(userIds) {
  if (!isDbConnected() || userIds.length === 0) return;
  await User.updateMany(
    { userId: { $in: userIds } },
    { $inc: { gamesPlayed: 1 } }
  );
}

async function getLeaderboard(limit = 10) {
  if (!isDbConnected()) return null;
  return User.find().sort({ score: -1 }).limit(limit).lean();
}

module.exports = {
  isDbConnected,
  findByUserId,
  createUser,
  updateUsername,
  incrementWin,
  incrementGamesPlayed,
  getLeaderboard,
};
