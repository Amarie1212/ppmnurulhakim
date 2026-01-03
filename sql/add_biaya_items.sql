-- Add biaya_items column to tb_info_ppm
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS biaya_items JSONB DEFAULT '[]'::jsonb;

-- Verify column was added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'tb_info_ppm' AND column_name = 'biaya_items';
