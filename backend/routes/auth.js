const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { authenticate } = require('../middleware/auth');

const SECRET  = process.env.JWT_SECRET         || 'sentinel_dev_secret_change_in_prod';
const REFRESH = process.env.JWT_REFRESH_SECRET || 'sentinel_refresh_secret_change_in_prod';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const [[user]] = await db.query(
      `SELECT u.user_id, u.username, u.password_hash, u.is_active,
              r.role_name AS role, o.officer_id
       FROM User u
       JOIN Role r ON r.role_id = u.role_id
       LEFT JOIN Officer o ON o.user_id = u.user_id
       WHERE u.username = ?`,
      [username]
    );

    if (!user || !user.is_active)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await db.query('UPDATE User SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

    const payload = {
      user_id:    user.user_id,
      username:   user.username,
      role:       user.role,
      officer_id: user.officer_id
    };

    const access_token  = jwt.sign(payload, SECRET,  { expiresIn: '8h' });
    const refresh_token = jwt.sign(payload, REFRESH, { expiresIn: '7d' });

    res.json({ access_token, refresh_token, user: payload });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(refresh_token, REFRESH);
    delete payload.iat; delete payload.exp;
    const access_token = jwt.sign(payload, SECRET, { expiresIn: '8h' });
    res.json({ access_token });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
