const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/officers
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT o.officer_id, o.full_name, o.badge_number,
              r.rank_name, s.station_name,
              COUNT(ca.case_id) AS active_cases
       FROM Officer o
       LEFT JOIN OfficerRank r ON r.rank_id = o.rank_id
       LEFT JOIN PoliceStation s ON s.station_id = o.station_id
       LEFT JOIN CrimeCase ca ON ca.lead_officer_id = o.officer_id AND ca.status NOT IN ('Closed','Convicted','Acquitted')
       GROUP BY o.officer_id
       ORDER BY o.full_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/officers/:id/workload
router.get('/:id/workload', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ca.case_number, ca.status, ca.priority, ca.filed_at,
              DATEDIFF(NOW(), ca.filed_at) AS age_days
       FROM CrimeCase ca
       WHERE ca.lead_officer_id = ?
       ORDER BY ca.filed_at DESC`, [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
