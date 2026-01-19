// Run migration to add payment detail fields to tb_pembayaran
const pool = require('./src/db');

async function migrate() {
  console.log('Running migration: add_pembayaran_fields...');
  
  try {
    // Add new columns (IF NOT EXISTS is not supported in all PostgreSQL versions, so we use try/catch)
    const queries = [
      `ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nama_pengirim VARCHAR(255)`,
      `ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nomor_rekening VARCHAR(50)`,
      `ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nama_bank VARCHAR(100)`,
      `ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS tanggal_transfer DATE`,
      `ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS alasan_tolak TEXT`
    ];
    
    for (const query of queries) {
      try {
        await pool.query(query);
        console.log('✓', query.substring(0, 60) + '...');
      } catch (err) {
        if (err.code === '42701') {
          // Column already exists, skip
          console.log('⏭ Column already exists:', query.substring(37, 60));
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify by showing table structure
    const { rows } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tb_pembayaran'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTable structure:');
    rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
    
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    pool.end();
  }
}

migrate();
