// Script untuk membuat/update tb_laporan dengan atribut download count
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('=== Membuat/Update Tabel Laporan ===\n');

    // Drop tabel lama jika ada
    await pool.query(`DROP TABLE IF EXISTS tb_laporan`);

    // Buat tabel baru dengan struktur lengkap
    await pool.query(`
      CREATE TABLE tb_laporan (
        id SERIAL PRIMARY KEY,
        
        -- Atribut Data Santri
        laporan_data_santri_count INTEGER DEFAULT 0,
        laporan_data_santri_last_download TIMESTAMP,
        
        -- Atribut Pembayaran
        laporan_pembayaran_count INTEGER DEFAULT 0,
        laporan_pembayaran_last_download TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Tabel tb_laporan dibuat');

    // Insert row awal
    await pool.query(`INSERT INTO tb_laporan (laporan_data_santri_count, laporan_pembayaran_count) VALUES (0, 0)`);
    console.log('✓ Data awal diinsert');

    console.log('\nStruktur tb_laporan:');
    console.log('- id');
    console.log('- laporan_data_santri_count (berapa kali download)');
    console.log('- laporan_data_santri_last_download (terakhir download)');
    console.log('- laporan_pembayaran_count (berapa kali download)');
    console.log('- laporan_pembayaran_last_download (terakhir download)');

    console.log('\n✅ Selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
