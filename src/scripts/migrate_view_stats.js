// Script untuk membuat tabel view stats TERPISAH per kategori
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Membuat tabel-tabel view stats terpisah...\n');

    // Hapus tabel lama jika ada
    await pool.query(`DROP TABLE IF EXISTS tb_view_stats`);
    console.log('✓ Tabel lama tb_view_stats dihapus (jika ada)');

    // 1. TABEL PROFIL DAN TARGET
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_profil_target (
        id SERIAL PRIMARY KEY,
        visi INTEGER DEFAULT 0,
        misi INTEGER DEFAULT 0,
        target_pencapaian INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO tb_profil_target (visi, misi, target_pencapaian) VALUES (0, 0, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ Tabel tb_profil_target dibuat');

    // 2. TABEL KESANTRIAN DAN AGENDA
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_kesantrian_agenda (
        id SERIAL PRIMARY KEY,
        ketentuan INTEGER DEFAULT 0,
        tata_tertib INTEGER DEFAULT 0,
        mingguan INTEGER DEFAULT 0,
        harian INTEGER DEFAULT 0,
        bulanan INTEGER DEFAULT 0,
        tahunan INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO tb_kesantrian_agenda (ketentuan, tata_tertib, mingguan, harian, bulanan, tahunan) VALUES (0, 0, 0, 0, 0, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ Tabel tb_kesantrian_agenda dibuat');

    // 3. TABEL ALUR DAN ADMINISTRASI
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_alur_administrasi (
        id SERIAL PRIMARY KEY,
        langkah INTEGER DEFAULT 0,
        rincian_biaya INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO tb_alur_administrasi (langkah, rincian_biaya) VALUES (0, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ Tabel tb_alur_administrasi dibuat');

    // 4. TABEL FASILITAS DAN GALERI
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_fasilitas_galeri (
        id SERIAL PRIMARY KEY,
        gambar_fasilitas INTEGER DEFAULT 0,
        gambar_kegiatan INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO tb_fasilitas_galeri (gambar_fasilitas, gambar_kegiatan) VALUES (0, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ Tabel tb_fasilitas_galeri dibuat');

    // 5. TABEL LOKASI DAN KONTAK
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_lokasi_kontak (
        id SERIAL PRIMARY KEY,
        peta_ppm INTEGER DEFAULT 0,
        kontak_kami INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`INSERT INTO tb_lokasi_kontak (peta_ppm, kontak_kami) VALUES (0, 0) ON CONFLICT DO NOTHING`);
    console.log('✓ Tabel tb_lokasi_kontak dibuat');

    // Tampilkan hasil
    console.log('\n=== Tabel-tabel yang dibuat ===');
    
    const tables = [
      'tb_profil_target',
      'tb_kesantrian_agenda', 
      'tb_alur_administrasi',
      'tb_fasilitas_galeri',
      'tb_lokasi_kontak'
    ];

    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
      console.log(`\n${table}:`, rows[0]);
    }

    console.log('\n✅ Migration selesai! 5 tabel terpisah dibuat.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
