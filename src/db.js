const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  connectionString: process.env.DATABASE_URL,
});

;(async () => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    console.log('PostgreSQL connected:', r.rows[0].now);
  } catch (e) {
    console.error('Connection error:', e.message);
  }
})();

module.exports = pool;
