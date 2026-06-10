const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/criminals/repeat-offenders  ← must come BEFORE /:id
router.get('/repeat-offenders', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT cr.criminal_id, cr.full_name, cr.risk_level, cr.arrest_status,
              COUNT(cc.case_id) AS total_cases,
              GROUP_CONCAT(DISTINCT ct.crime_name ORDER BY ct.crime_name SEPARATOR ', ') AS crime_categories
       FROM Criminal cr
       LEFT JOIN CaseCriminal cc ON cc.criminal_id = cr.criminal_id
       LEFT JOIN CrimeCase ca ON ca.case_id = cc.case_id
       LEFT JOIN FIR f ON f.fir_id = ca.fir_id
       LEFT JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       WHERE cr.is_repeat_offender = 1
       GROUP BY cr.criminal_id
       ORDER BY total_cases DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/criminals
router.get('/', async (req, res, next) => {
  const { is_repeat_offender, risk_level, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = ['1=1']; const params = [];
  if (is_repeat_offender !== undefined) { where.push('cr.is_repeat_offender = ?'); params.push(+is_repeat_offender); }
  if (risk_level) { where.push('cr.risk_level = ?'); params.push(risk_level); }
  try {
    const [rows] = await db.query(
      `SELECT cr.criminal_id, cr.full_name, cr.alias_names, cr.gender, cr.date_of_birth,
              cr.risk_level, cr.arrest_status, cr.is_repeat_offender,
              COUNT(cc.case_id) AS total_cases
       FROM Criminal cr
       LEFT JOIN CaseCriminal cc ON cc.criminal_id = cr.criminal_id
       WHERE ${where.join(' AND ')}
       GROUP BY cr.criminal_id
       ORDER BY cr.risk_level DESC, total_cases DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Criminal cr WHERE ${where.join(' AND ')}`, params
    );
    res.json({ data: rows, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/criminals/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await db.query(
      `SELECT cr.*, COUNT(cc.case_id) AS total_cases
       FROM Criminal cr
       LEFT JOIN CaseCriminal cc ON cc.criminal_id = cr.criminal_id
       WHERE cr.criminal_id = ?
       GROUP BY cr.criminal_id`, [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Criminal not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/criminals
router.post('/', async (req, res, next) => {
  const { crn, full_name, alias_names, date_of_birth, gender, risk_level, arrest_status } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Criminal (crn, full_name, alias_names, date_of_birth, gender, risk_level, arrest_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crn, full_name, JSON.stringify(alias_names || []), date_of_birth, gender, risk_level || 'Low', arrest_status || 'At Large']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

// PUT /api/criminals/:id
router.put('/:id', async (req, res, next) => {
  const { full_name, alias_names, risk_level, arrest_status } = req.body;
  try {
    await db.query(
      `UPDATE Criminal SET full_name = ?, alias_names = ?, risk_level = ?, arrest_status = ?
       WHERE criminal_id = ?`,
      [full_name, JSON.stringify(alias_names || []), risk_level, arrest_status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/criminals/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM Criminal WHERE criminal_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
