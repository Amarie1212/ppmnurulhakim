const pool = require('../db');

async function debugTable() {
  try {
    const tables = await pool.query("SELECT key, value FROM (SELECT 1 as key, 'tb_santri' as value) t"); // Dummy query just to check connection
    // Better: List all tables
    const allTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', allTables.rows.map(r => r.table_name).join(', '));

    const sample = await pool.query('SELECT * FROM tb_santri LIMIT 1');
    if (sample.rows.length > 0) {
        console.log('Sample row keys:', Object.keys(sample.rows[0]));
        // Check specific fields value for the sample
        const r = sample.rows[0];
        console.log('kk_path:', r.kk_path);
        console.log('ktp_path:', r.ktp_path);
    } else {
        console.log('tb_santri is empty.');
    }
    
    const count = await pool.query('SELECT count(*) FROM tb_santri');
    console.log('Total rows:', count.rows[0].count);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    pool.end();
  }
}

debugTable();
