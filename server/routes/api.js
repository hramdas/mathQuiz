const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/leaderboard', userController.getLeaderboard);
router.post('/register', userController.register);

module.exports = router;
