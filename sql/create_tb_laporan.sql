-- ============================================================
-- TABEL LAPORAN KEUANGAN
-- Untuk sistem submit laporan dari Keuangan ke Ketua
-- ============================================================

CREATE TABLE IF NOT EXISTS tb_laporan (
    id SERIAL PRIMARY KEY,
    periode_mulai DATE NOT NULL,
    periode_akhir DATE NOT NULL,
    total_pembayaran INTEGER DEFAULT 0,
    catatan TEXT,
    dibuat_oleh INTEGER,              -- ID pengurus yang buat
    dibuat_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
    disetujui_oleh INTEGER,           -- ID ketua yang approve
    disetujui_at TIMESTAMP,
    komentar_ketua TEXT               -- Catatan dari ketua saat approve/reject
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_laporan_status ON tb_laporan(status);
CREATE INDEX IF NOT EXISTS idx_laporan_dibuat ON tb_laporan(dibuat_at);
