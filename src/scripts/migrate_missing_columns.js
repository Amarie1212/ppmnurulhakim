// Migration script: Add missing JSONB columns to tb_info_ppm
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Adding missing JSONB columns to tb_info_ppm...');
    
    // Add all missing JSONB columns
    const columns = [
      { name: 'target_santri', default: '[]' },
      { name: 'manajemen_kesantrian', default: '[]' },
      { name: 'agenda_harian', default: '[]' },
      { name: 'agenda_mingguan', default: '[]' },
      { name: 'agenda_bulanan', default: '[]' },
      { name: 'agenda_tahunan', default: '[]' },
      { name: 'biaya_items', default: '[]' },
      { name: 'fasilitas_gallery', default: '[]' }
    ];
    
    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS ${col.name} JSONB DEFAULT '${col.default}'::jsonb`);
        console.log(`✓ Column ${col.name} added/verified`);
      } catch (e) {
        console.log(`  Column ${col.name} might already exist: ${e.message}`);
      }
    }
    
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();
