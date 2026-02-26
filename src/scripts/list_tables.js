// Script untuk mengecek semua tabel di database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('=== DAFTAR TABEL DATABASE ===');
    console.log('Total:', rows.length, 'tabel\n');
    
    rows.forEach(r => console.log('-', r.table_name));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
