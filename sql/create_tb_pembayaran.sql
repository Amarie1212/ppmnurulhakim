-- ============================================================
-- TABEL PEMBAYARAN SHODAQOH OPERASIONAL
-- Jalankan SQL ini di database PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS tb_pembayaran (
    id SERIAL PRIMARY KEY,
    santri_id INTEGER REFERENCES tb_santri(id) ON DELETE CASCADE,
    jumlah NUMERIC(12, 0) DEFAULT 0,
    keterangan TEXT,
    bukti_gambar TEXT,           -- Path ke file gambar bukti
    bukti_text TEXT,             -- Keterangan text jika tidak pakai gambar
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, VERIFIED, REJECTED
    verified_by INTEGER,         -- ID pengurus yang verifikasi
    verified_at TIMESTAMP,       -- Waktu verifikasi
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_pembayaran_santri ON tb_pembayaran(santri_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_status ON tb_pembayaran(status);

-- Contoh data dummy (opsional, hapus jika tidak perlu)
-- INSERT INTO tb_pembayaran (santri_id, jumlah, bukti_gambar, status) VALUES (1, 100000, '/uploads/dummy.jpg', 'PENDING');
