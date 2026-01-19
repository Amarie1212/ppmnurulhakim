-- ============================================================
-- MIGRATION: Add Payment Details Fields to tb_pembayaran
-- Run this SQL in PostgreSQL database
-- ============================================================

-- Add new columns for payment details (matching thesis Deskripsi Dokumen)
ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nama_pengirim VARCHAR(255);
ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nomor_rekening VARCHAR(50);
ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS nama_bank VARCHAR(100);
ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS tanggal_transfer DATE;

-- Also add alasan_tolak if not exists (for rejection reason)
ALTER TABLE tb_pembayaran ADD COLUMN IF NOT EXISTS alasan_tolak TEXT;

-- Comments for documentation
COMMENT ON COLUMN tb_pembayaran.nama_pengirim IS 'Nama pengirim transfer (opsional, jika beda dengan nama santri)';
COMMENT ON COLUMN tb_pembayaran.nomor_rekening IS 'Nomor rekening pengirim';
COMMENT ON COLUMN tb_pembayaran.nama_bank IS 'Nama bank pengirim (BSI, BRI, BNI, dll)';
COMMENT ON COLUMN tb_pembayaran.tanggal_transfer IS 'Tanggal transfer dilakukan';
COMMENT ON COLUMN tb_pembayaran.alasan_tolak IS 'Alasan penolakan pembayaran';

-- Verify migration
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tb_pembayaran';
