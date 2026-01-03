// Migration script: Add fasilitas_gallery column
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Adding fasilitas_gallery column...');
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS fasilitas_gallery JSONB DEFAULT '[]'::jsonb`);
    console.log('✓ fasilitas_gallery column added successfully!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();
