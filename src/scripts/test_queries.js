// Test apakah semua query berjalan dengan benar
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    console.log('=== CEK SEMUA QUERY BERFUNGSI ===\n');

    // Test query tb_informasi (sebelumnya tb_info_ppm)
    console.log('1. Query tb_informasi...');
    const info = await pool.query('SELECT id FROM tb_informasi LIMIT 1');
    console.log('   ✓ OK -', info.rows.length, 'record(s)');

    // Test query tb_hasil_verifikasi_daftar
    console.log('2. Query tb_hasil_verifikasi_daftar...');
    const daftar = await pool.query('SELECT id FROM tb_hasil_verifikasi_daftar LIMIT 1');
    console.log('   ✓ OK -', daftar.rows.length, 'record(s)');

    // Test query tb_hasil_verifikasi_bayar
    console.log('3. Query tb_hasil_verifikasi_bayar...');
    const bayar = await pool.query('SELECT id FROM tb_hasil_verifikasi_bayar LIMIT 1');
    console.log('   ✓ OK -', bayar.rows.length, 'record(s)');

    // Test query view stats tables
    console.log('4. Query view stats tables...');
    await pool.query('SELECT * FROM tb_profil_target LIMIT 1');
    await pool.query('SELECT * FROM tb_kesantrian_agenda LIMIT 1');
    await pool.query('SELECT * FROM tb_alur_administrasi LIMIT 1');
    await pool.query('SELECT * FROM tb_fasilitas_galeri LIMIT 1');
    await pool.query('SELECT * FROM tb_lokasi_kontak LIMIT 1');
    console.log('   ✓ OK - 5 view stats tables');

    console.log('\n✅ SEMUA QUERY BERFUNGSI DENGAN BAIK!');
    console.log('   Aplikasi siap digunakan.');

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

test();
