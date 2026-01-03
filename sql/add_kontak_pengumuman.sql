-- Add kontak_hp and kontak_email columns to tb_info_ppm
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_hp VARCHAR(50);
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_email VARCHAR(100);
