// Script to add biaya_items column to tb_info_ppm
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Adding biaya_items column...');
    await pool.query(`
      ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS biaya_items JSONB DEFAULT '[]'::jsonb
    `);
    console.log('✓ biaya_items column added successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'tb_info_ppm' AND column_name = 'biaya_items'
    `);
    console.log('Verification:', result.rows);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();
