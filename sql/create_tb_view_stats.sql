-- =============================================
-- Migration: Create 5 Separate View Stats Tables
-- Description: Menyimpan statistik view count per section website (tabel terpisah)
-- Created: 2026-02-03
-- =============================================

-- Hapus tabel lama jika ada
DROP TABLE IF EXISTS tb_view_stats;

-- =============================================
-- 1. TABEL PROFIL DAN TARGET
-- =============================================
CREATE TABLE IF NOT EXISTS tb_profil_target (
    id SERIAL PRIMARY KEY,
    visi INTEGER DEFAULT 0,
    misi INTEGER DEFAULT 0,
    target_pencapaian INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tb_profil_target (visi, misi, target_pencapaian) 
VALUES (0, 0, 0) ON CONFLICT DO NOTHING;

-- =============================================
-- 2. TABEL KESANTRIAN DAN AGENDA
-- =============================================
CREATE TABLE IF NOT EXISTS tb_kesantrian_agenda (
    id SERIAL PRIMARY KEY,
    ketentuan INTEGER DEFAULT 0,
    tata_tertib INTEGER DEFAULT 0,
    mingguan INTEGER DEFAULT 0,
    harian INTEGER DEFAULT 0,
    bulanan INTEGER DEFAULT 0,
    tahunan INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tb_kesantrian_agenda (ketentuan, tata_tertib, mingguan, harian, bulanan, tahunan) 
VALUES (0, 0, 0, 0, 0, 0) ON CONFLICT DO NOTHING;

-- =============================================
-- 3. TABEL ALUR DAN ADMINISTRASI
-- =============================================
CREATE TABLE IF NOT EXISTS tb_alur_administrasi (
    id SERIAL PRIMARY KEY,
    langkah INTEGER DEFAULT 0,
    rincian_biaya INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tb_alur_administrasi (langkah, rincian_biaya) 
VALUES (0, 0) ON CONFLICT DO NOTHING;

-- =============================================
-- 4. TABEL FASILITAS DAN GALERI
-- =============================================
CREATE TABLE IF NOT EXISTS tb_fasilitas_galeri (
    id SERIAL PRIMARY KEY,
    gambar_fasilitas INTEGER DEFAULT 0,
    gambar_kegiatan INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tb_fasilitas_galeri (gambar_fasilitas, gambar_kegiatan) 
VALUES (0, 0) ON CONFLICT DO NOTHING;

-- =============================================
-- 5. TABEL LOKASI DAN KONTAK
-- =============================================
CREATE TABLE IF NOT EXISTS tb_lokasi_kontak (
    id SERIAL PRIMARY KEY,
    peta_ppm INTEGER DEFAULT 0,
    kontak_kami INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tb_lokasi_kontak (peta_ppm, kontak_kami) 
VALUES (0, 0) ON CONFLICT DO NOTHING;

-- =============================================
-- Contoh query untuk increment view count:
-- UPDATE tb_profil_target SET visi = visi + 1, updated_at = NOW() WHERE id = 1;
-- UPDATE tb_kesantrian_agenda SET ketentuan = ketentuan + 1, updated_at = NOW() WHERE id = 1;
-- =============================================
