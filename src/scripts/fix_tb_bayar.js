// Script untuk memperbaiki tb_hasil_verifikasi_bayar
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('=== Memperbaiki tb_hasil_verifikasi_bayar ===\n');

    // Drop dan buat ulang dengan struktur baru
    await pool.query(`DROP TABLE IF EXISTS tb_hasil_verifikasi_bayar`);
    console.log('✓ Tabel lama dihapus');

    await pool.query(`
      CREATE TABLE tb_hasil_verifikasi_bayar (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        alasan_tolak TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Tabel baru dibuat');

    console.log('\nStruktur baru:');
    console.log('- id');
    console.log('- nama');
    console.log('- status (PENDING/VERIFIED/REJECTED)');
    console.log('- alasan_tolak');

    console.log('\n✅ Selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
