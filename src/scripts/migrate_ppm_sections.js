// Migration script: Add new columns for PPM Info sections
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Adding new columns for PPM Info sections...');
    
    // Target Santri
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS target_santri JSONB DEFAULT '[]'::jsonb`);
    console.log('✓ target_santri column added');
    
    // Manajemen Kesantrian
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS manajemen_kesantrian JSONB DEFAULT '[]'::jsonb`);
    console.log('✓ manajemen_kesantrian column added');
    
    // Agenda
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS agenda_harian JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS agenda_mingguan JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS agenda_bulanan JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS agenda_tahunan JSONB DEFAULT '[]'::jsonb`);
    console.log('✓ agenda columns added');
    
    // Lokasi
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS lokasi_alamat TEXT`);
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS lokasi_gmaps_embed TEXT`);
    await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS lokasi_image TEXT`);
    console.log('✓ lokasi columns added');
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (e) {
    console.error('Migration Error:', e.message);
    process.exit(1);
  }
}

migrate();
