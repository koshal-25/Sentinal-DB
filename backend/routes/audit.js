const router = require('express').Router();
const db     = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET /api/audit
router.get('/', authorize('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.username 
       FROM AuditLog a
       LEFT JOIN User u ON u.user_id = a.user_id
       ORDER BY a.performed_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
