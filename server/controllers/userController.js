const userService = require('../services/userService');

let gameManager = null;

function init(gm) {
  gameManager = gm;
}

async function getLeaderboard(_req, res) {
  try {
    const leaderboard = await userService.getLeaderboard();
    res.json(leaderboard || gameManager.getInMemoryLeaderboard());
  } catch {
    res.json(gameManager.getInMemoryLeaderboard());
  }
}

async function register(req, res) {
  const { username, userId: existingId } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const trimmed = username.trim().substring(0, 20);

  try {
    if (existingId) {
      const existing = await userService.findByUserId(existingId);
      if (existing) {
        if (existing.username !== trimmed) {
          await userService.updateUsername(existingId, trimmed);
        }
        return res.json({ userId: existing.userId, username: trimmed, score: existing.score, wins: existing.wins });
      }
    }

    const user = await userService.createUser(trimmed);
    res.json(user);
  } catch (err) {
    const fallback = await userService.createUser(trimmed);
    res.json(fallback);
  }
}

module.exports = { init, getLeaderboard, register };
