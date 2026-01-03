const pool = require('../src/db');

async function run() {
  try {
    console.log('Adding columns...');

    // tb_akun_santri
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_akun_santri' AND column_name='alasan_tolak') THEN 
          ALTER TABLE tb_akun_santri ADD COLUMN alasan_tolak TEXT; 
        END IF; 
      END $$;
    `);
    console.log('tb_akun_santri updated.');

    // tb_santri
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_santri' AND column_name='alasan_tolak') THEN 
          ALTER TABLE tb_santri ADD COLUMN alasan_tolak TEXT; 
        END IF; 
      END $$;
    `);
    console.log('tb_santri updated.');

    // tb_pembayaran
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tb_pembayaran' AND column_name='alasan_tolak') THEN 
          ALTER TABLE tb_pembayaran ADD COLUMN alasan_tolak TEXT; 
        END IF; 
      END $$;
    `);
    console.log('tb_pembayaran updated.');

    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
