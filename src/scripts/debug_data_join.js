const pool = require('../db');

async function debugData() {
  try {
    console.log("Checking tb_santri and tb_akun_santri join...");
    const res = await pool.query(`
      SELECT 
        s.id as santri_id,
        s.email as santri_email,
        s.nik,
        s.biodata_verified,
        a.id as akun_id,
        a.email as akun_email,
        a.status as akun_status
      FROM tb_santri s
      LEFT JOIN tb_akun_santri a ON s.email = a.email
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    res.rows.forEach(row => {
      console.log('------------------------------------------------');
      console.log(`Santri: ${row.santri_email} | NIK: ${row.nik} | BioVerified: ${row.biodata_verified}`);
      console.log(`Akun: ${row.akun_email} | Status: ${row.akun_status}`);
      console.log(`Match: ${row.santri_email === row.akun_email}`);
    });

  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}

debugData();
