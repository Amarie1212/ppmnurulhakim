-- Migration: Add status_biodata column to tb_santri
-- This tracks whether the biodata has been reviewed (supporting verification, not admission decision)

ALTER TABLE tb_santri ADD COLUMN IF NOT EXISTS status_biodata VARCHAR(20) DEFAULT 'PENDING';

-- Update existing records that have biodata filled to PENDING
UPDATE tb_santri SET status_biodata = 'PENDING' WHERE status_biodata IS NULL;

-- Comment: Status values:
-- 'PENDING' = Biodata belum dicek
-- 'VERIFIED' = Biodata sudah dicek dan lengkap
-- Note: Ini hanya verifikasi kelengkapan data, bukan penentu diterima/ditolak
