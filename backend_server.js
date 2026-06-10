/* =============================================================
   SENTINEL CRMS — PRODUCTION BACKEND
   Node.js + Express + MySQL2 + JWT + bcrypt
   File: server.js (entry point)
   ============================================================= */

// ---------- Dependencies ----------
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ---------- Security Middleware ----------
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — all API routes
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 min
    max: 200,
    message: { error: 'Too many requests, please slow down.' }
}));

// Login endpoint gets stricter limiting
app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
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

// Static (frontend build)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Global error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`🔵 Sentinel CRMS running on port ${PORT}`));
module.exports = app;

/* =============================================================
   FILE: config/db.js — Connection pool
   ============================================================= */
/*
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:              process.env.DB_HOST,
    port:              process.env.DB_PORT || 3306,
    user:              process.env.DB_USER,
    password:          process.env.DB_PASSWORD,
    database:          process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:   20,
    queueLimit:        0,
    timezone:          '+05:30',
    charset:           'utf8mb4'
});

// Health check on startup
pool.getConnection()
    .then(conn => { console.log('✅ Database connected'); conn.release(); })
    .catch(err  => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

module.exports = pool;
*/

/* =============================================================
   FILE: middleware/auth.js — JWT Verification
   ============================================================= */
/*
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

// Verify JWT and attach user to req
function authenticate(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
        return res.status(401).json({ error: 'No token provided' });

    const token = header.split(' ')[1];
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Role-based guard factory
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role))
            return res.status(403).json({ error: 'Access denied for your role' });
        next();
    };
}

module.exports = { authenticate, authorize };
*/

/* =============================================================
   FILE: middleware/audit.js — Automatic audit logging
   ============================================================= */
/*
const db = require('../config/db');

function auditLog(action, tableName) {
    return async (req, res, next) => {
        const original = res.json.bind(res);

        res.json = async (body) => {
            // Fire-and-forget audit insert after response
            if (req.user && !res.statusCode.toString().startsWith('4')) {
                try {
                    await db.query(
                        `INSERT INTO AuditLog (user_id, action, table_name, record_id, new_data, ip_address, user_agent)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            req.user.user_id, action, tableName,
                            body?.id || req.params?.id || null,
                            JSON.stringify(req.body || {}),
                            req.ip,
                            req.headers['user-agent']?.slice(0, 255)
                        ]
                    );
                } catch (e) {
                    console.error('Audit log failed:', e.message);
                }
            }
            return original(body);
        };
        next();
    };
}

module.exports = { auditLog };
*/

/* =============================================================
   FILE: controllers/cases.controller.js
   ============================================================= */
/*
const db = require('../config/db');

// POST /api/cases/register — Full Complaint→FIR→Case transaction
async function registerCase(req, res, next) {
    const {
        complainant, complaint, fir, caseData
    } = req.body;

    // Basic validation
    if (!complainant?.full_name || !fir?.fir_number || !caseData?.case_number)
        return res.status(400).json({ error: 'Missing required fields' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Complainant
        const [cmplt] = await conn.query(
            `INSERT INTO Complainant (full_name, gender, age, contact_no, address)
             VALUES (?, ?, ?, ?, ?)`,
            [complainant.full_name, complainant.gender, complainant.age,
             complainant.contact_no, complainant.address]
        );
        const complainant_id = cmplt.insertId;

        // 2. Complaint
        const [comp] = await conn.query(
            `INSERT INTO Complaint (complaint_number, complaint_date, crime_type_id, description,
             status, station_id, receiving_officer_id, complainant_id)
             VALUES (?, ?, ?, ?, 'Converted to FIR', ?, ?, ?)`,
            [complaint.complaint_number, complaint.complaint_date, complaint.crime_type_id,
             complaint.description, complaint.station_id, req.user.officer_id, complainant_id]
        );
        const complaint_id = comp.insertId;

        // 3. FIR
        const [firRes] = await conn.query(
            `INSERT INTO FIR (fir_number, crime_date, crime_location, description, status,
             crime_type_id, station_id, registering_officer_id, complaint_id)
             VALUES (?, ?, ?, ?, 'Open', ?, ?, ?, ?)`,
            [fir.fir_number, fir.crime_date, fir.crime_location, fir.description,
             fir.crime_type_id, fir.station_id, req.user.officer_id, complaint_id]
        );
        const fir_id = firRes.insertId;

        // 4. Case
        const [caseRes] = await conn.query(
            `INSERT INTO CrimeCase (case_number, status, priority, fir_id, lead_officer_id)
             VALUES (?, 'Open', ?, ?, ?)`,
            [caseData.case_number, caseData.priority || 'Normal', fir_id, req.user.officer_id]
        );
        const case_id = caseRes.insertId;

        // 5. Auto-assign lead officer
        await conn.query(
            `INSERT INTO CaseOfficer (case_id, officer_id, assigned_role)
             VALUES (?, ?, 'Lead Investigating Officer')`,
            [case_id, req.user.officer_id]
        );

        // 6. Initial log entry
        await conn.query(
            `INSERT INTO CaseLog (case_id, action_type, action_taken, new_status, performed_by)
             VALUES (?, 'Status Change', 'Case registered', 'Open', ?)`,
            [case_id, req.user.officer_id]
        );

        await conn.commit();
        res.status(201).json({ success: true, complaint_id, fir_id, case_id });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
}

// GET /api/cases — Active cases with filters
async function getCases(req, res, next) {
    const { status, priority, officer_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = ['1=1'];
    const params = [];

    if (status)     { where.push('ca.status = ?');           params.push(status); }
    if (priority)   { where.push('ca.priority = ?');         params.push(priority); }
    if (officer_id) { where.push('ca.lead_officer_id = ?');  params.push(officer_id); }

    // Officers only see their own cases
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
            `SELECT COUNT(*) AS total FROM CrimeCase ca WHERE ${where.join(' AND ')}`,
            params
        );
        res.json({ data: rows, total, page: +page, limit: +limit });
    } catch (err) { next(err); }
}

// PATCH /api/cases/:id/status
async function updateCaseStatus(req, res, next) {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const VALID = ['Open','Under Investigation','Chargesheeted',
                   'Trial in Progress','Convicted','Acquitted','Closed','Referred'];
    if (!VALID.includes(status))
        return res.status(400).json({ error: 'Invalid status value' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[cur]] = await conn.query(
            'SELECT status FROM CrimeCase WHERE case_id = ? FOR UPDATE', [id]);
        if (!cur) return res.status(404).json({ error: 'Case not found' });

        await conn.query(
            `UPDATE CrimeCase SET status = ?,
             closed_at = IF(? IN ('Closed','Convicted','Acquitted'), NOW(), NULL)
             WHERE case_id = ?`,
            [status, status, id]
        );

        await conn.query(
            `INSERT INTO CaseLog (case_id, action_type, action_taken, old_status, new_status, remarks, performed_by)
             VALUES (?, 'Status Change', ?, ?, ?, ?, ?)`,
            [id, `Status updated to ${status}`, cur.status, status, remarks, req.user.officer_id]
        );

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
}

// GET /api/cases/:id/timeline
async function getCaseTimeline(req, res, next) {
    try {
        const [rows] = await db.query(
            `SELECT cl.logged_at, cl.action_type, cl.action_taken,
                    cl.old_status, cl.new_status, cl.remarks,
                    o.full_name AS performed_by, rk.rank_name
             FROM CaseLog cl
             LEFT JOIN Officer o ON o.officer_id = cl.performed_by
             LEFT JOIN OfficerRank rk ON rk.rank_id = o.rank_id
             WHERE cl.case_id = ?
             ORDER BY cl.logged_at ASC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) { next(err); }
}

module.exports = { registerCase, getCases, updateCaseStatus, getCaseTimeline };
*/

/* =============================================================
   FILE: routes/cases.js
   ============================================================= */
/*
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/cases.controller');

// All case routes require authentication
router.use(authenticate);

// Register new case (Officer + Admin only)
router.post('/register',
    authorize('Admin','Officer'),
    ctrl.registerCase
);

// List cases
router.get('/', ctrl.getCases);

// Get single case
router.get('/:id', ctrl.getCaseById);

// Update status (Officer, Investigator, Admin)
router.patch('/:id/status',
    authorize('Admin','Officer','Investigator'),
    ctrl.updateCaseStatus
);

// Assign officer
router.post('/:id/officers',
    authorize('Admin','Officer'),
    ctrl.assignOfficer
);

// Timeline
router.get('/:id/timeline', ctrl.getCaseTimeline);

// Add criminal to case
router.post('/:id/criminals',
    authorize('Admin','Officer','Investigator'),
    ctrl.addCriminalToCase
);

module.exports = router;
*/

/* =============================================================
   FILE: routes/auth.js — Login + Token refresh
   ============================================================= */
/*
const router   = require('express').Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const { authenticate } = require('../middleware/auth');

const SECRET  = process.env.JWT_SECRET;
const REFRESH = process.env.JWT_REFRESH_SECRET;

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

        // Update last login
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

router.post('/logout', authenticate, async (req, res) => {
    // In production: blacklist the token in Redis
    res.json({ success: true });
});

module.exports = router;
*/
