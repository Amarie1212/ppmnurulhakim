// Cek struktur tb_pembayaran
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tb_pembayaran'")
  .then(r => {
    console.log('Kolom tb_pembayaran:');
    r.rows.forEach(c => console.log('  -', c.column_name, ':', c.data_type));
    pool.end();
  });
