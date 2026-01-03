const pool = require('../db');

async function listColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tb_santri'
      ORDER BY ordinal_position
    `);
    console.log('Columns in tb_santri:');
    res.rows.forEach(r => console.log(' -', r.column_name));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

listColumns();
