const pool = require('../db');

async function migrate() {
  try {
    console.log('Migrating tb_santri...');
    await pool.query(`
      ALTER TABLE tb_santri 
      ADD COLUMN IF NOT EXISTS kk_path VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ktp_path VARCHAR(255);
    `);
    console.log('Success: Columns added (or already existed).');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    pool.end();
  }
}

migrate();
