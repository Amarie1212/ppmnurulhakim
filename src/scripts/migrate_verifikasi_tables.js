// Script untuk:
// 1. Rename tb_hasil_verifikasi -> tb_verifikasi_pendaftaran
// 2. Buat tb_verifikasi_pembayaran baru

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('=== Migration Verifikasi Tables ===\n');

    // 1. Rename tabel hasil_verifikasi -> verifikasi_pendaftaran
    console.log('1. Rename tb_hasil_verifikasi -> tb_verifikasi_pendaftaran...');
    await pool.query(`ALTER TABLE IF EXISTS tb_hasil_verifikasi RENAME TO tb_verifikasi_pendaftaran`);
    console.log('✓ Tabel renamed');

    // 2. Buat tabel verifikasi_pembayaran
    console.log('\n2. Membuat tabel tb_verifikasi_pembayaran...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_verifikasi_pembayaran (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        akun VARCHAR(20) DEFAULT 'PENDING',
        biodata VARCHAR(20) DEFAULT 'PENDING',
        alasan TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Tabel tb_verifikasi_pembayaran dibuat');

    // Tampilkan struktur
    console.log('\n=== Struktur Tabel ===');
    console.log('\ntb_verifikasi_pendaftaran:');
    console.log('- id, nama, akun, biodata, alasan');
    
    console.log('\ntb_verifikasi_pembayaran:');
    console.log('- id, nama, akun, biodata, alasan');

    console.log('\n✅ Migration selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
