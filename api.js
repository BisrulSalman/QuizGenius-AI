// ─── QuizGenius Backend API Client ──────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

const api = {
  token: localStorage.getItem('qg_token') || null,
  currentUser: JSON.parse(localStorage.getItem('qg_user') || 'null'),

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  setAuth(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('qg_token', token);
    localStorage.setItem('qg_user', JSON.stringify(user));
  },

  clearAuth() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('qg_token');
    localStorage.removeItem('qg_user');
  },

  isLoggedIn() {
    return !!this.token && !!this.currentUser;
  },

  // ─── Auth ───────────────────────────────────────────────────
  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.setAuth(data.token, data.user);
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.setAuth(data.token, data.user);
    return data;
  },

  async getProfile() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) { this.clearAuth(); throw new Error(data.error); }
    this.currentUser = data.user;
    localStorage.setItem('qg_user', JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    this.clearAuth();
  },

  // ─── Gemini Key (server-side) ────────────────────────────────
  async saveGeminiKey(key) {
    const res = await fetch(`${API_BASE}/auth/gemini-key`, {
      method: 'PUT', headers: this.headers(),
      body: JSON.stringify({ geminiApiKey: key })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getGeminiKeyStatus() {
    const res = await fetch(`${API_BASE}/auth/gemini-key-status`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.hasKey;
  },

  // ─── Gemini Proxy ────────────────────────────────────────────
  async generateViaGemini(text, count) {
    const res = await fetch(`${API_BASE}/gemini/generate`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ text, count })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.questions;
  },

  // ─── Quiz CRUD ──────────────────────────────────────────────
  async saveQuiz(quizData) {
    const res = await fetch(`${API_BASE}/quiz`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify(quizData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getHistory(page = 1, limit = 10) {
    const res = await fetch(`${API_BASE}/quiz?page=${page}&limit=${limit}`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getQuizDetail(id) {
    const res = await fetch(`${API_BASE}/quiz/${id}`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.quiz;
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/quiz/stats`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async deleteQuiz(id) {
    const res = await fetch(`${API_BASE}/quiz/${id}`, {
      method: 'DELETE', headers: this.headers()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // ─── Leaderboard ────────────────────────────────────────────
  async getLeaderboard(limit = 20) {
    const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`, { headers: this.headers() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.leaderboard;
  }
};
