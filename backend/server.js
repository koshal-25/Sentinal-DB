/* =============================================================
   SENTINEL CRMS — BACKEND SERVER
   Node.js + Express + MySQL2 + JWT + bcrypt
   ============================================================= */

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ---------- Security Middleware ----------
app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // Allow any *.vercel.app subdomain
    if (/\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please slow down.' }
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts.' }
}));

// ---------- Routes ----------
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/cases',     require('./routes/cases'));
app.use('/api/fir',       require('./routes/fir'));
app.use('/api/criminals', require('./routes/criminals'));
app.use('/api/evidence',  require('./routes/evidence'));
app.use('/api/officers',  require('./routes/officers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit',     require('./routes/audit'));
app.use('/api/court',     require('./routes/court'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Only call listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`🔵 Sentinel CRMS running on port ${PORT}`));
}

module.exports = app;
