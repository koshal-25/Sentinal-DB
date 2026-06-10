const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'sentinel_crms',
  waitForConnections: true,
  connectionLimit:    10,       // lower for serverless cold-starts
  queueLimit:         0,
  timezone:           '+05:30',
  charset:            'utf8mb4',
  // TiDB Cloud / PlanetScale require SSL — enable when DB_SSL=true
  ...(process.env.DB_SSL === 'true' && {
    ssl: { rejectUnauthorized: true }
  }),
});

// Health check on startup (skip in serverless to avoid blocking cold starts)
if (process.env.VERCEL !== '1') {
  pool.getConnection()
    .then(conn => { console.log('✅ Database connected'); conn.release(); })
    .catch(err  => { console.error('❌ DB connection failed:', err.message); });
}

module.exports = pool;
