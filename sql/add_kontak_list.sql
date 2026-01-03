-- Add missing column kontak_list to tb_info_ppm
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS kontak_list JSONB DEFAULT '[]';
