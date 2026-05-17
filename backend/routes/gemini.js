const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/gemini/generate ──────────────────────────────────────
// Proxy Gemini API request through backend (keeps API key secure on server)
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { text, count } = req.body;

    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'Text content must be at least 100 characters.' });
    }

    // Retrieve user's stored Gemini key, or fall back to server-wide key
    const user = await User.findById(req.user._id).select('geminiApiKey');
    const apiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'No Gemini API key configured. Please set your key in your profile settings or contact the admin.'
      });
    }

    const questionCount = Math.min(Math.max(parseInt(count) || 10, 3), 20);
    const contextText = text.substring(0, 45000);

    const systemPrompt = `You are an elite, highly rigorous professional academic exam engine. 
Based strictly on the source materials provided, generate exactly ${questionCount} educational multiple-choice questions. 
Ensure options are highly challenging, distinct, and directly test conceptual understanding, rather than just simple vocabulary.

CRITICAL FORMAT REQUIREMENT:
You must output a raw, syntactically perfect JSON array of objects with exactly the following JSON structure, with absolutely zero additional formatting, markdown wrapping (such as \`\`\`json blocks), or introductory/concluding text:
[
  {
    "question": "What is the primary factor...?",
    "options": ["Option Alpha", "Option Beta", "Option Gamma", "Option Delta"],
    "correctAnswer": "Option Alpha",
    "explanation": "Option Alpha is correct because it aligns..."
  }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: `SOURCE TEXT:\n\n${contextText}` }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMessage = errorData.error?.message || `HTTP ${response.status}`;
      return res.status(response.status >= 500 ? 502 : 400).json({
        error: `Gemini API Error: ${errMessage}`
      });
    }

    const data = await response.json();
    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!outputText) {
      return res.status(502).json({ error: 'Empty response from Gemini API.' });
    }

    // Clean markdown wrapping if present
    let cleanJson = outputText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    try {
      const questions = JSON.parse(cleanJson);
      if (!Array.isArray(questions)) {
        return res.status(502).json({ error: 'Gemini returned non-array response.' });
      }

      res.json({ questions });
    } catch (parseErr) {
      console.error('Gemini response parse error:', outputText);
      res.status(502).json({ error: 'Failed to parse Gemini response into quiz format.' });
    }
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Failed to generate quiz via Gemini AI.' });
  }
});

module.exports = router;
