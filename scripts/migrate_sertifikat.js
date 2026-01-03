const pool = require('../src/db');

(async () => {
  try {
    console.log('Migrating database...');
    await pool.query("ALTER TABLE tb_santri ADD COLUMN IF NOT EXISTS sertifikat_path TEXT;");
    console.log('Migration successful: sertifikat_path column added.');
  } catch (e) {
    console.error('Migration failed:', e.message);
  } finally {
    await pool.end();
  }
})();
