const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [[cases]]    = await db.query(`SELECT COUNT(*) AS total_cases,
      SUM(status='Open') AS open_cases,
      SUM(status IN ('Closed','Convicted','Acquitted')) AS closed_cases
      FROM CrimeCase`);
    const [[officers]] = await db.query(`SELECT COUNT(*) AS active_officers FROM Officer WHERE is_active = 1`);
    const [[criminals]]= await db.query(`SELECT COUNT(*) AS total_criminals FROM Criminal`);
    const [[firs]]     = await db.query(`SELECT COUNT(*) AS total_firs FROM FIR`);
    res.json({ ...cases, ...officers, ...criminals, ...firs });
  } catch (err) { next(err); }
});

// GET /api/dashboard/crime-trends
router.get('/crime-trends', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(f.registered_at, '%Y-%m') AS month,
              ct.crime_name, COUNT(*) AS count
       FROM FIR f
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       WHERE f.registered_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month, ct.crime_type_id
       ORDER BY month ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/officer-workload
router.get('/officer-workload', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT o.full_name, r.rank_name, s.station_name,
              COUNT(ca.case_id) AS active_cases,
              SUM(CASE WHEN ca.priority IN ('High', 'Critical') THEN 1 ELSE 0 END) AS high_priority_cases
       FROM Officer o
       LEFT JOIN OfficerRank r ON r.rank_id = o.rank_id
       LEFT JOIN PoliceStation s ON s.station_id = o.station_id
       LEFT JOIN CaseOfficer co ON co.officer_id = o.officer_id AND co.removed_at IS NULL
       LEFT JOIN CrimeCase ca ON ca.case_id = co.case_id AND ca.status NOT IN ('Closed','Convicted','Acquitted')
       WHERE o.is_active = 1
       GROUP BY o.officer_id
       ORDER BY active_cases DESC, high_priority_cases DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
