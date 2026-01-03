-- =============================================
-- CMS Database Migration Script
-- PPM Nurul Hakim
-- =============================================

-- 1. Extend tb_info_ppm with new columns
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS hero_title VARCHAR(255) DEFAULT 'Selamat Datang di PPM Nurul Hakim';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'Pesantren Mahasiswa dengan pembinaan akhlak, peningkatan ilmu agama dan sains.';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS profil_pondok TEXT DEFAULT 'Pondok Pesantren Mahasiswa (PPM) Nurul Hakim adalah pesantren yang dikhususkan bagi mahasiswa yang ingin mendalami ilmu agama sambil menempuh pendidikan di perguruan tinggi di area Jatinangor.';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS visi TEXT DEFAULT 'Menjadi pondok pesantren mahasiswa yang unggul dalam pembinaan akhlak, peningkatan ilmu agama dan sains, serta pengabdian kepada masyarakat.';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS misi TEXT DEFAULT 'Pembinaan akhlakul karimah santri|Peningkatan literasi agama dan sains|Pengembangan keterampilan dan karakter|Pengabdian kepada masyarakat';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS nilai TEXT DEFAULT 'Berakhlak mulia, berilmu tinggi, mandiri, dan bermanfaat bagi sesama dengan semangat ukhuwah Islamiyah.';
ALTER TABLE tb_info_ppm ADD COLUMN IF NOT EXISTS alamat TEXT DEFAULT 'Jl. Raya Jatinangor, Sumedang, Jawa Barat';

-- 2. Create tb_keunggulan table
CREATE TABLE IF NOT EXISTS tb_keunggulan (
  id SERIAL PRIMARY KEY,
  judul VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  icon VARCHAR(50) DEFAULT 'star',
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default keunggulan data
INSERT INTO tb_keunggulan (judul, deskripsi, icon, urutan) VALUES
('Sanad Keilmuan Jelas', 'Dibimbing langsung oleh para Kyai dan Asatidz yang kompeten di bidangnya.', 'book', 1),
('Lokasi Strategis', 'Akses mudah ke kampus utama: UNPAD, ITB, IPDN, dan IKOPIN Jatinangor.', 'location', 2),
('Biaya Terjangkau', 'Biaya pendidikan yang ringan dengan fasilitas asrama yang memadai.', 'wallet', 3)
ON CONFLICT DO NOTHING;

-- 3. Create tb_fasilitas table
CREATE TABLE IF NOT EXISTS tb_fasilitas (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default fasilitas data
INSERT INTO tb_fasilitas (nama, deskripsi, urutan) VALUES
('Asrama', 'Asrama nyaman dengan kamar terpisah untuk santri putra dan putri.', 1),
('Masjid', 'Masjid luas untuk pelaksanaan sholat berjamaah dan kegiatan mengaji.', 2),
('Dapur Umum', 'Fasilitas dapur bersama di setiap gedung asrama untuk kebutuhan santri.', 3)
ON CONFLICT DO NOTHING;

-- 4. Create tb_galeri table
CREATE TABLE IF NOT EXISTS tb_galeri (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  caption VARCHAR(255),
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default galeri data
INSERT INTO tb_galeri (path, caption, urutan) VALUES
('/img/ppm.jpg', 'Kajian Kitab Kuning', 1),
('/img/ppm.jpg', 'Sholat Berjamaah', 2),
('/img/ppm.jpg', 'Ekstrakurikuler', 3)
ON CONFLICT DO NOTHING;

-- 5. Create tb_alur_pendaftaran table
CREATE TABLE IF NOT EXISTS tb_alur_pendaftaran (
  id SERIAL PRIMARY KEY,
  judul VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default alur pendaftaran data
INSERT INTO tb_alur_pendaftaran (judul, deskripsi, urutan) VALUES
('Registrasi Akun', 'Klik tombol "Daftar" dan isi form registrasi dengan data lengkap (nama, email, no WhatsApp, kelompok, desa, daerah).', 1),
('Menunggu Verifikasi', 'Setelah registrasi, tunggu verifikasi dari admin/panitia. Anda akan mendapat notifikasi setelah akun diverifikasi.', 2),
('Isi Biodata Lengkap', 'Login dan lengkapi biodata diri (tempat/tanggal lahir, alamat, pendidikan, dll). Data ini digunakan untuk administrasi pondok.', 3),
('Upload Bukti Pembayaran', 'Lakukan pembayaran shodaqoh operasional dan upload bukti transfer. Setelah diverifikasi, Anda resmi terdaftar sebagai santri!', 4)
ON CONFLICT DO NOTHING;

-- 6. Create tb_peraturan table
CREATE TABLE IF NOT EXISTS tb_peraturan (
  id SERIAL PRIMARY KEY,
  isi TEXT NOT NULL,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default peraturan data
INSERT INTO tb_peraturan (isi, urutan) VALUES
('Wajib mengikuti seluruh kegiatan pondok (sholat berjamaah, kajian, piket).', 1),
('Dilarang membawa kendaraan bermotor ke area pondok.', 2),
('Wajib menjaga kebersihan kamar dan lingkungan asrama.', 3),
('Dilarang merokok dan membawa barang terlarang.', 4),
('Wajib meminta izin kepada pengurus jika berhalangan mengikuti kegiatan.', 5),
('Mematuhi jam malam yang telah ditetapkan.', 6),
('Berpakaian sopan dan rapi sesuai syariat Islam.', 7)
ON CONFLICT DO NOTHING;

-- Update default values for existing tb_info_ppm row if exists
UPDATE tb_info_ppm SET 
  hero_title = COALESCE(hero_title, 'Selamat Datang di PPM Nurul Hakim'),
  hero_subtitle = COALESCE(hero_subtitle, 'Pesantren Mahasiswa dengan pembinaan akhlak, peningkatan ilmu agama dan sains.'),
  profil_pondok = COALESCE(profil_pondok, 'Pondok Pesantren Mahasiswa (PPM) Nurul Hakim adalah pesantren yang dikhususkan bagi mahasiswa.'),
  visi = COALESCE(visi, 'Menjadi pondok pesantren mahasiswa yang unggul dalam pembinaan akhlak, peningkatan ilmu agama dan sains, serta pengabdian kepada masyarakat.'),
  misi = COALESCE(misi, 'Pembinaan akhlakul karimah santri|Peningkatan literasi agama dan sains|Pengembangan keterampilan dan karakter|Pengabdian kepada masyarakat'),
  nilai = COALESCE(nilai, 'Berakhlak mulia, berilmu tinggi, mandiri, dan bermanfaat bagi sesama dengan semangat ukhuwah Islamiyah.'),
  alamat = COALESCE(alamat, 'Jl. Raya Jatinangor, Sumedang, Jawa Barat')
WHERE id = 1;
