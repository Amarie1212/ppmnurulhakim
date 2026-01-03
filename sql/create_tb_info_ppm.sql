-- Tabel untuk CMS Beranda PPM Nurul Hakim
-- v2 - Dengan kolom lengkap untuk semua section

DROP TABLE IF EXISTS tb_info_ppm;

CREATE TABLE tb_info_ppm (
  id SERIAL PRIMARY KEY,
  
  -- Hero Section
  hero_title VARCHAR(200) DEFAULT 'Selamat Datang di PPM Nurul Hakim',
  hero_subtitle TEXT,
  
  -- Profil
  profil_pondok TEXT,
  visi TEXT,
  misi JSONB DEFAULT '[]',
  nilai TEXT,
  keunggulan JSONB DEFAULT '[]',
  
  -- Fasilitas
  fasilitas JSONB DEFAULT '[]',
  
  -- Galeri
  galeri JSONB DEFAULT '[]',
  
  -- Alur Pendaftaran
  alur_pendaftaran JSONB DEFAULT '[]',
  peraturan JSONB DEFAULT '[]',
  
  -- Biaya & Jadwal
  biaya VARCHAR(100) DEFAULT 'Rp 3.500.000',
  jadwal_mulai DATE,
  jadwal_selesai DATE,
  
  -- Kontak
  kontak_list JSONB DEFAULT '[]',
  kontak_email VARCHAR(100),
  alamat TEXT,
  
  -- Section Titles (untuk customize nama menu)
  section_titles JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default data
INSERT INTO tb_info_ppm (
  hero_title, 
  hero_subtitle, 
  biaya
) VALUES (
  'Selamat Datang di PPM Nurul Hakim',
  'Pondok Pesantren Mahasiswa Pusat Lombok',
  'Rp 3.500.000'
);
