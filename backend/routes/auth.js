const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ─── POST /api/auth/register ────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Check duplicates
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ error: `An account with this ${field} already exists.` });
    }

    const user = new User({
      username,
      email,
      password,
      displayName: displayName || username
    });

    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// ─── PUT /api/auth/profile ──────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { displayName, avatar } = req.body;
    const updates = {};
    if (displayName) updates.displayName = displayName;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({ message: 'Profile updated.', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ─── PUT /api/auth/gemini-key ───────────────────────────────────────
router.put('/gemini-key', authenticate, async (req, res) => {
  try {
    const { geminiApiKey } = req.body;
    await User.findByIdAndUpdate(req.user._id, { geminiApiKey: geminiApiKey || '' });
    res.json({ message: geminiApiKey ? 'Gemini API key saved.' : 'Gemini API key cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update API key.' });
  }
});

// ─── GET /api/auth/gemini-key-status ────────────────────────────────
router.get('/gemini-key-status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('geminiApiKey');
    res.json({ hasKey: !!user.geminiApiKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check API key status.' });
  }
});

module.exports = router;
