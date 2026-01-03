const pool = require('../db');

async function checkData() {
  try {
    const res = await pool.query(`
      SELECT 
        s.id, 
        s.nama, 
        s.nik, 
        s.biodata_verified,
        a.status as akun_status,
        s.email,
        s.created_at
      FROM tb_santri s 
      JOIN tb_akun_santri a ON s.email = a.email 
      ORDER BY s.created_at DESC 
      LIMIT 5
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkData();
