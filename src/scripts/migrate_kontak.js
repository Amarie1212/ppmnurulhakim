const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_hp VARCHAR(50);
    `);
    await pool.query(`
      ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_email VARCHAR(100);
    `);
    await pool.query(`
      ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_instagram VARCHAR(100);
    `);
    await pool.query(`
      ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_panitia TEXT;
    `);
    console.log('✅ Columns added to tb_info_ppm including kontak_panitia');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();
