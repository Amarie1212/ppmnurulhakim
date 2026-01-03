-- Migration: Add biodata_verified column to tb_santri
-- Date: 2024-12-25
-- Purpose: Track biodata verification status for approval/rejection workflow

ALTER TABLE tb_santri 
ADD COLUMN IF NOT EXISTS biodata_verified BOOLEAN DEFAULT false;

-- Set existing santri dengan biodata yang sudah ada as unverified (menunggu verifikasi)
-- Hanya set true jika biodata memang sudah lengkap
UPDATE tb_santri 
SET biodata_verified = false 
WHERE biodata_verified IS NULL AND nik IS NOT NULL;

-- Set santri tanpa biodata sebagai verified (tidak perlu verifikasi karena belum isi)
UPDATE tb_santri 
SET biodata_verified = true 
WHERE biodata_verified IS NULL AND nik IS NULL;

COMMENT ON COLUMN tb_santri.biodata_verified IS 'Flag biodata verification status. false = needs verification OR rejected, true = approved OR not yet filled';
