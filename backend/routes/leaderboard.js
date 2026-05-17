const express = require('express');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/leaderboard ───────────────────────────────────────────
// Global leaderboard - top users by average score
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const topUsers = await User.find({
      'stats.totalQuizzes': { $gte: 1 }
    })
      .sort({ 'stats.averageScore': -1, 'stats.totalQuizzes': -1 })
      .limit(limit)
      .select('username displayName avatar stats.totalQuizzes stats.averageScore stats.bestScore stats.streakDays');

    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      totalQuizzes: user.stats.totalQuizzes,
      averageScore: user.stats.averageScore,
      bestScore: user.stats.bestScore,
      streakDays: user.stats.streakDays,
      isCurrentUser: req.user ? user._id.equals(req.user._id) : false
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
  }
});

// ─── GET /api/leaderboard/recent ────────────────────────────────────
// Recent top quiz scores
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    const recentTopQuizzes = await Quiz.find({ status: 'completed' })
      .sort({ scorePercentage: -1, timeTakenSec: 1, createdAt: -1 })
      .limit(limit)
      .populate('user', 'username displayName avatar')
      .select('title scorePercentage correctCount totalQuestions timeTakenSec rating engine createdAt');

    res.json({ recentTopQuizzes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve recent scores.' });
  }
});

module.exports = router;
