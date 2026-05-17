const express = require('express');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/quiz ─────────────────────────────────────────────────
// Save a completed or in-progress quiz
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      sourceType,
      sourceFileName,
      engine,
      questions,
      totalQuestions,
      correctCount,
      scorePercentage,
      timeTakenSec,
      status,
      rating
    } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Quiz questions are required.' });
    }

    const quiz = new Quiz({
      user: req.user._id,
      title: title || `Quiz - ${new Date().toLocaleDateString()}`,
      sourceType: sourceType || 'text',
      sourceFileName: sourceFileName || '',
      engine: engine || 'local',
      questions,
      totalQuestions: totalQuestions || questions.length,
      correctCount: correctCount || 0,
      scorePercentage: scorePercentage || 0,
      timeTakenSec: timeTakenSec || 0,
      status: status || 'completed',
      rating: rating || 'Needs Study'
    });

    await quiz.save();

    // Update user stats if quiz is completed
    if (status === 'completed') {
      await updateUserStats(req.user._id, quiz);
    }

    res.status(201).json({
      message: 'Quiz saved successfully!',
      quiz
    });
  } catch (err) {
    console.error('Save quiz error:', err);
    res.status(500).json({ error: 'Failed to save quiz.' });
  }
});

// ─── GET /api/quiz ──────────────────────────────────────────────────
// Get user's quiz history
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [quizzes, total] = await Promise.all([
      Quiz.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-questions'),
      Quiz.countDocuments({ user: req.user._id })
    ]);

    res.json({
      quizzes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve quiz history.' });
  }
});

// ─── GET /api/quiz/stats ────────────────────────────────────────────
// Get user's quiz statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    const recentQuizzes = await Quiz.find({ user: req.user._id, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title scorePercentage correctCount totalQuestions timeTakenSec rating createdAt');

    res.json({
      stats: user.stats,
      recentQuizzes
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve statistics.' });
  }
});

// ─── GET /api/quiz/:id ──────────────────────────────────────────────
// Get a specific quiz with full details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve quiz.' });
  }
});

// ─── DELETE /api/quiz/:id ───────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json({ message: 'Quiz deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quiz.' });
  }
});

// ─── Helper: Update user stats after quiz completion ────────────────
async function updateUserStats(userId, quiz) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const stats = user.stats;
    stats.totalQuizzes += 1;
    stats.totalQuestions += quiz.totalQuestions;
    stats.totalCorrect += quiz.correctCount;
    stats.totalTimeSec += quiz.timeTakenSec;

    if (quiz.scorePercentage > stats.bestScore) {
      stats.bestScore = quiz.scorePercentage;
    }

    // Recalculate average
    stats.averageScore = Math.round((stats.totalCorrect / stats.totalQuestions) * 100);

    // Update streak
    const now = new Date();
    const lastQuiz = stats.lastQuizDate;
    if (lastQuiz) {
      const diffDays = Math.floor((now - lastQuiz) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        stats.streakDays += diffDays === 1 ? 1 : 0;
      } else {
        stats.streakDays = 1;
      }
    } else {
      stats.streakDays = 1;
    }
    stats.lastQuizDate = now;

    await user.save();
  } catch (err) {
    console.error('Failed to update user stats:', err);
  }
}

module.exports = router;
