const router = require('express').Router();
const db     = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/fir/crime-types
router.get('/crime-types', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM CrimeType ORDER BY crime_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/fir/stations
router.get('/stations', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT station_id, station_name FROM PoliceStation ORDER BY station_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/fir
router.get('/', async (req, res, next) => {
  const { status, station_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = ['1=1']; const params = [];
  if (status)     { where.push('f.status = ?');     params.push(status); }
  if (station_id) { where.push('f.station_id = ?'); params.push(station_id); }
  try {
    const [rows] = await db.query(
      `SELECT f.fir_id, f.fir_number, f.crime_date, f.crime_location,
              f.status, f.registered_at, ct.crime_name,
              o.full_name AS registering_officer, s.station_name
       FROM FIR f
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       LEFT JOIN Officer o ON o.officer_id = f.registering_officer_id
       LEFT JOIN PoliceStation s ON s.station_id = f.station_id
       WHERE ${where.join(' AND ')}
       ORDER BY f.registered_at DESC LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM FIR f WHERE ${where.join(' AND ')}`, params
    );
    res.json({ data: rows, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/fir/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await db.query(
      `SELECT f.*, ct.crime_name, o.full_name AS registering_officer, s.station_name
       FROM FIR f
       JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
       LEFT JOIN Officer o ON o.officer_id = f.registering_officer_id
       LEFT JOIN PoliceStation s ON s.station_id = f.station_id
       WHERE f.fir_id = ?`, [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'FIR not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/fir
router.post('/', async (req, res, next) => {
  const { fir_number, crime_date, crime_time, crime_location, description, crime_type_id, station_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO FIR (fir_number, crime_date, crime_time, crime_location, description, status, crime_type_id, station_id, registering_officer_id)
       VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)`,
      [fir_number, crime_date, crime_time, crime_location, description, crime_type_id, station_id, req.user.officer_id]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

// PUT /api/fir/:id
router.put('/:id', async (req, res, next) => {
  const { crime_date, crime_time, crime_location, description, status, crime_type_id, station_id } = req.body;
  try {
    await db.query(
      `UPDATE FIR SET crime_date = ?, crime_time = ?, crime_location = ?, description = ?, status = ?, crime_type_id = ?, station_id = ?
       WHERE fir_id = ?`,
      [crime_date, crime_time, crime_location, description, status || 'Open', crime_type_id, station_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/fir/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM FIR WHERE fir_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
