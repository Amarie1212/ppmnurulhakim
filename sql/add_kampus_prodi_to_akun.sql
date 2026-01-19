-- Add kampus and prodi columns to tb_akun_santri
ALTER TABLE tb_akun_santri ADD COLUMN IF NOT EXISTS kampus VARCHAR(255);
ALTER TABLE tb_akun_santri ADD COLUMN IF NOT EXISTS prodi VARCHAR(255);
