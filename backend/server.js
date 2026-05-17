require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const leaderboardRoutes = require('./routes/leaderboard');
const geminiRoutes = require('./routes/gemini');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static front-end files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve front-end for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Quiz.html'));
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ─── MongoDB Connection & Server Startup ────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizgenius';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   ✅  MongoDB Connected Successfully         ║');
    console.log(`║   📁  Database: ${mongoose.connection.name.padEnd(28)}║`);
    console.log('╚══════════════════════════════════════════════╝');

    app.listen(PORT, () => {
      console.log('');
      console.log(`🚀 QuizGenius Backend running on http://localhost:${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    console.log('');
    console.log('💡 Make sure MongoDB is running. You can:');
    console.log('   1. Start MongoDB service locally');
    console.log('   2. Use MongoDB Atlas (cloud) — update MONGODB_URI in .env');
    console.log('');
    process.exit(1);
  });
