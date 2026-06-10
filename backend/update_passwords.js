const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function run() {
  const hash = await bcrypt.hash('Demo@1234', 12);
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sentinel_v2'
  });
  await pool.query('UPDATE User SET password_hash = ?', [hash]);
  console.log('Passwords updated successfully');
  process.exit(0);
}
run();
