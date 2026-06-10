const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/evidence/types
router.get('/types', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM EvidenceType ORDER BY type_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/evidence/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await db.query(
      `SELECT e.*, ca.case_number,
              o.full_name AS collected_by_name, et.type_name
       FROM Evidence e
       LEFT JOIN CrimeCase ca ON ca.case_id = e.case_id
       LEFT JOIN Officer o ON o.officer_id = e.seized_by
       LEFT JOIN EvidenceType et ON et.evidence_type_id = e.evidence_type_id
       WHERE e.evidence_id = ?`, [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Evidence not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// GET /api/evidence (list for a case)
router.get('/', async (req, res, next) => {
  const { case_id } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT e.*, o.full_name AS collected_by_name, et.type_name
       FROM Evidence e
       LEFT JOIN Officer o ON o.officer_id = e.seized_by
       LEFT JOIN EvidenceType et ON et.evidence_type_id = e.evidence_type_id
       ${case_id ? 'WHERE e.case_id = ?' : ''}
       ORDER BY e.seized_date DESC`,
      case_id ? [case_id] : []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/evidence
router.post('/', async (req, res, next) => {
  const { evidence_ref, evidence_type_id, description, seized_date, seized_by, location_seized, custody_status, case_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Evidence (evidence_ref, evidence_type_id, description, seized_date, seized_by, location_seized, custody_status, case_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [evidence_ref, evidence_type_id, description, seized_date, seized_by, location_seized, custody_status || 'Collected', case_id]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

// PUT /api/evidence/:id
router.put('/:id', async (req, res, next) => {
  const { custody_status, storage_location, description } = req.body;
  try {
    await db.query(
      `UPDATE Evidence SET custody_status = ?, storage_location = ?, description = ?
       WHERE evidence_id = ?`,
      [custody_status, storage_location, description, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/evidence/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM Evidence WHERE evidence_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
