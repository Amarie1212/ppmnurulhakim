// Script untuk membuat tb_verifikasi_pendaftaran dan tb_verifikasi_pembayaran
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('=== Membuat Tabel Verifikasi ===\n');

    // 1. tb_verifikasi_pendaftaran (sama seperti tb_hasil_verifikasi_daftar)
    console.log('1. Membuat tb_verifikasi_pendaftaran...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_verifikasi_pendaftaran (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        akun VARCHAR(20) DEFAULT 'PENDING',
        biodata VARCHAR(20) DEFAULT 'PENDING',
        alasan_tolak_akun TEXT,
        alasan_tolak_biodata TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✓ tb_verifikasi_pendaftaran dibuat');

    // 2. tb_verifikasi_pembayaran (sama seperti tb_hasil_verifikasi_bayar)
    console.log('2. Membuat tb_verifikasi_pembayaran...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_verifikasi_pembayaran (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        alasan_tolak TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✓ tb_verifikasi_pembayaran dibuat');

    console.log('\n✅ Selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
