const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  userAnswer: { type: String, default: null },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Untitled Quiz',
    trim: true,
    maxlength: 200
  },
  sourceType: {
    type: String,
    enum: ['pdf', 'text'],
    default: 'text'
  },
  sourceFileName: {
    type: String,
    default: ''
  },
  engine: {
    type: String,
    enum: ['local', 'ai'],
    default: 'local'
  },
  questions: [questionSchema],
  totalQuestions: {
    type: Number,
    required: true
  },
  correctCount: {
    type: Number,
    default: 0
  },
  scorePercentage: {
    type: Number,
    default: 0
  },
  timeTakenSec: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  rating: {
    type: String,
    enum: ['Exceptional', 'Competent', 'Developing', 'Needs Study'],
    default: 'Needs Study'
  }
}, {
  timestamps: true
});

// Index for leaderboard queries
quizSchema.index({ scorePercentage: -1, timeTakenSec: 1 });
quizSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
