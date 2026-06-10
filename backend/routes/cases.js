const router = require('express').Router();
const db     = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET /api/cases
router.get('/', async (req, res, next) => {
  const { status, priority, officer_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = ['1=1'];
  const params = [];

  if (status)     { where.push('ca.status = ?');          params.push(status); }
  if (priority)   { where.push('ca.priority = ?');        params.push(priority); }
  if (officer_id) { where.push('ca.lead_officer_id = ?'); params.push(officer_id); }
  if (req.user.role === 'Officer')
    { where.push('ca.lead_officer_id = ?'); params.push(req.user.officer_id); }

  try {
    const [rows] = await db.query(
      `SELECT ca.case_id, ca.case_number, ca.status, ca.priority,
              ca.filed_at, DATEDIFF(NOW(), ca.filed_at) AS age_days,
              f.fir_number, f.crime_location, ct.crime_name,
              o.full_name AS lead_officer
       FROM CrimeCase ca
       JOIN FIR f ON f.fir_id = ca.fir_id
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       LEFT JOIN Officer o ON o.officer_id = ca.lead_officer_id
       WHERE ${where.join(' AND ')}
       ORDER BY ca.priority DESC, ca.filed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM CrimeCase ca WHERE ${where.join(' AND ')}`, params
    );
    res.json({ data: rows, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/cases/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await db.query(
      `SELECT ca.*, f.fir_number, f.crime_location, f.crime_date,
              ct.crime_name, o.full_name AS lead_officer
       FROM CrimeCase ca
       JOIN FIR f ON f.fir_id = ca.fir_id
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       LEFT JOIN Officer o ON o.officer_id = ca.lead_officer_id
       WHERE ca.case_id = ?`, [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Case not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// GET /api/cases/:id/timeline
router.get('/:id/timeline', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT cl.logged_at, cl.action_type, cl.action_taken,
              cl.old_status, cl.new_status, cl.remarks,
              o.full_name AS performed_by
       FROM CaseLog cl
       LEFT JOIN Officer o ON o.officer_id = cl.performed_by
       WHERE cl.case_id = ? ORDER BY cl.logged_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/cases/:id/status
router.patch('/:id/status', authorize('Admin','Officer','Investigator'), async (req, res, next) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const VALID = ['Open','Under Investigation','Chargesheeted',
                 'Trial in Progress','Convicted','Acquitted','Closed','Referred'];
  if (!VALID.includes(status))
    return res.status(400).json({ error: 'Invalid status value' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[cur]] = await conn.query('SELECT status FROM CrimeCase WHERE case_id = ? FOR UPDATE', [id]);
    if (!cur) return res.status(404).json({ error: 'Case not found' });
    await conn.query(
      `UPDATE CrimeCase SET status = ?,
       closed_at = IF(? IN ('Closed','Convicted','Acquitted'), NOW(), NULL)
       WHERE case_id = ?`, [status, status, id]
    );
    await conn.query(
      `INSERT INTO CaseLog (case_id, action_type, action_taken, old_status, new_status, remarks, performed_by)
       VALUES (?, 'Status Change', ?, ?, ?, ?, ?)`,
      [id, `Status updated to ${status}`, cur.status, status, remarks, req.user.officer_id]
    );
    await conn.commit();
    res.json({ success: true });
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

// POST /api/cases/register
router.post('/register', authorize('Admin','Officer'), async (req, res, next) => {
  const { complainant, complaint, fir, caseData } = req.body;
  if (!complainant?.full_name || !fir?.fir_number || !caseData?.case_number)
    return res.status(400).json({ error: 'Missing required fields' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [cmplt] = await conn.query(
      `INSERT INTO Complainant (full_name, gender, age, contact_no, address) VALUES (?,?,?,?,?)`,
      [complainant.full_name, complainant.gender, complainant.age, complainant.contact_no, complainant.address]
    );
    const complainant_id = cmplt.insertId;
    const [comp] = await conn.query(
      `INSERT INTO Complaint (complaint_number, complaint_date, crime_type_id, description,
       status, station_id, receiving_officer_id, complainant_id)
       VALUES (?,?,?,?,'Converted to FIR',?,?,?)`,
      [complaint.complaint_number, complaint.complaint_date, complaint.crime_type_id,
       complaint.description, complaint.station_id, req.user.officer_id, complainant_id]
    );
    const [firRes] = await conn.query(
      `INSERT INTO FIR (fir_number, crime_date, crime_location, description, status,
       crime_type_id, station_id, registering_officer_id, complaint_id)
       VALUES (?,?,?,?,'Open',?,?,?,?)`,
      [fir.fir_number, fir.crime_date, fir.crime_location, fir.description,
       fir.crime_type_id, fir.station_id, req.user.officer_id, comp.insertId]
    );
    const fir_id = firRes.insertId;
    const [caseRes] = await conn.query(
      `INSERT INTO CrimeCase (case_number, status, priority, fir_id, lead_officer_id) VALUES (?,?,?,?,?)`,
      [caseData.case_number, 'Open', caseData.priority || 'Normal', fir_id, req.user.officer_id]
    );
    const case_id = caseRes.insertId;
    await conn.query(
      `INSERT INTO CaseOfficer (case_id, officer_id, assigned_role) VALUES (?,?,'Lead Investigating Officer')`,
      [case_id, req.user.officer_id]
    );
    await conn.query(
      `INSERT INTO CaseLog (case_id, action_type, action_taken, new_status, performed_by)
       VALUES (?,'Status Change','Case registered','Open',?)`,
      [case_id, req.user.officer_id]
    );
    await conn.commit();
    res.status(201).json({ success: true, fir_id, case_id });
  } catch (err) { await conn.rollback(); next(err); }
  finally { conn.release(); }
});

// POST /api/cases - Simple case creation
router.post('/', authorize('Admin','Officer'), async (req, res, next) => {
  const { case_number, priority, status, fir_id, lead_officer_id } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO CrimeCase (case_number, priority, status, fir_id, lead_officer_id) VALUES (?, ?, ?, ?, ?)',
      [case_number, priority || 'Normal', status || 'Open', fir_id, lead_officer_id || req.user.officer_id]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

// PUT /api/cases/:id
router.put('/:id', authorize('Admin','Officer'), async (req, res, next) => {
  const { case_number, priority, status, lead_officer_id } = req.body;
  try {
    await db.query(
      'UPDATE CrimeCase SET case_number = ?, priority = ?, status = ?, lead_officer_id = ? WHERE case_id = ?',
      [case_number, priority, status, lead_officer_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/cases/:id
router.delete('/:id', authorize('Admin'), async (req, res, next) => {
  try {
    await db.query('DELETE FROM CrimeCase WHERE case_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
