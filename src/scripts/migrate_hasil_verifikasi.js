// Script untuk membuat tabel hasil verifikasi daftar dan bayar
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('=== Membuat Tabel Hasil Verifikasi ===\n');

    // Hapus tabel lama
    await pool.query(`DROP TABLE IF EXISTS tb_verifikasi_pendaftaran`);
    await pool.query(`DROP TABLE IF EXISTS tb_verifikasi_pembayaran`);
    console.log('✓ Tabel lama dihapus');

    // 1. Tabel Hasil Verifikasi Daftar (Pendaftaran)
    console.log('\n1. Membuat tb_hasil_verifikasi_daftar...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_hasil_verifikasi_daftar (
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
    console.log('✓ Tabel tb_hasil_verifikasi_daftar dibuat');

    // 2. Tabel Hasil Verifikasi Bayar (Pembayaran)
    console.log('\n2. Membuat tb_hasil_verifikasi_bayar...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_hasil_verifikasi_bayar (
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
    console.log('✓ Tabel tb_hasil_verifikasi_bayar dibuat');

    // Tampilkan struktur
    console.log('\n=== Struktur Tabel ===');
    console.log('Kedua tabel memiliki atribut:');
    console.log('- id');
    console.log('- nama');
    console.log('- akun (PENDING/VERIFIED/REJECTED)');
    console.log('- biodata (PENDING/VERIFIED/REJECTED)');
    console.log('- alasan_tolak_akun');
    console.log('- alasan_tolak_biodata');

    console.log('\n✅ Migration selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
