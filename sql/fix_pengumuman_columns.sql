-- Add missing columns for Kelola Pengumuman feature
-- Run this script to fix the save issue

ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS pengumuman TEXT;
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS tanggal_kedatangan DATE;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tb_info_ppm' 
AND column_name IN ('pengumuman', 'tanggal_kedatangan');
