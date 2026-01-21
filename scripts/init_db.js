const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2];

if (!connectionString) {
  console.error('Error: Masukkan Connection URL sebagai argumen.');
  console.error('Contoh: node scripts/init_db.js "postgresql://postgres:password@roundhouse.proxy.rlwy.net:12345/railway"');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Penting untuk koneksi ke cloud
});

async function run() {
  try {
    console.log('Menghubungkan ke database...');
    await client.connect();
    console.log('Berhasil terhubung!');
    
    const sqlPath = path.join(__dirname, '../schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Menjalankan schema.sql (membuat tabel)...');
    await client.query(sql);
    
    console.log('✅ DATABASE BERHASIL DI-SETUP!');
    console.log('Sekarang Anda bisa buka web dan daftar sebagai admin.');
  } catch (err) {
    console.error('❌ Terjadi Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
