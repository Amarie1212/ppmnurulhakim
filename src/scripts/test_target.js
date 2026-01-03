// Quick test script to insert test data into target_santri
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const testData = ["Test Target 1", "Test Target 2"];
    const result = await pool.query(
      `UPDATE tb_info_ppm SET target_santri = $1::jsonb WHERE id = (SELECT id FROM tb_info_ppm LIMIT 1)`,
      [JSON.stringify(testData)]
    );
    console.log('Updated rows:', result.rowCount);
    
    // Verify
    const verify = await pool.query(`SELECT target_santri FROM tb_info_ppm LIMIT 1`);
    console.log('Verified data:', verify.rows[0]?.target_santri);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

test();
