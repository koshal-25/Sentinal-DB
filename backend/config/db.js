const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:              process.env.DB_PORT     || 3306,
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'sentinel_crms',
  waitForConnections: true,
  connectionLimit:   20,
  queueLimit:        0,
  timezone:          '+05:30',
  charset:           'utf8mb4'
});

// Health check on startup
pool.getConnection()
  .then(conn => { console.log('✅ Database connected'); conn.release(); })
  .catch(err  => { console.error('❌ DB connection failed:', err.message); });

module.exports = pool;
