const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/court/courts
router.get('/courts', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM Court ORDER BY court_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/court/proceedings
router.get('/proceedings', async (req, res, next) => {
  const { case_id, court_id } = req.query;
  let where = ['1=1']; const params = [];
  if (case_id) { where.push('cp.case_id = ?'); params.push(case_id); }
  if (court_id) { where.push('cp.court_id = ?'); params.push(court_id); }
  
  try {
    const [rows] = await db.query(
      `SELECT cp.*, c.court_name, ca.case_number, ct.crime_name
       FROM CourtProceeding cp
       JOIN Court c ON c.court_id = cp.court_id
       JOIN CrimeCase ca ON ca.case_id = cp.case_id
       JOIN FIR f ON f.fir_id = ca.fir_id
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       WHERE ${where.join(' AND ')}
       ORDER BY cp.hearing_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/court/proceedings
router.post('/proceedings', async (req, res, next) => {
  const { case_id, court_id, hearing_date, next_date, proceeding_type, judge_name, outcome, notes } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO CourtProceeding (case_id, court_id, hearing_date, next_date, proceeding_type, judge_name, outcome, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [case_id, court_id, hearing_date, next_date || null, proceeding_type, judge_name, outcome, notes]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

// DELETE /api/court/proceedings/:id
router.delete('/proceedings/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM CourtProceeding WHERE proceeding_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/court/judgments
router.get('/judgments', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*, ca.case_number, c.court_name
       FROM Judgment j
       JOIN CrimeCase ca ON ca.case_id = j.case_id
       JOIN Court c ON c.court_id = j.court_id
       ORDER BY j.judgment_date DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/court/judgments
router.post('/judgments', async (req, res, next) => {
  const { case_id, court_id, judgment_date, verdict, sentence_years, sentence_notes } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Judgment (case_id, court_id, judgment_date, verdict, sentence_years, sentence_notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [case_id, court_id, judgment_date, verdict, sentence_years || 0, sentence_notes]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

module.exports = router;
