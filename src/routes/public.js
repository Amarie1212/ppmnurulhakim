const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const fs = require('fs');

const router = express.Router();

/* ============================================================
   CONFIG & MIDDLEWARE
   ============================================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
       return cb(null, true);
    }
    cb(new Error('File harus gambar atau PDF'));
  }
});

function toTitleCase(s) {
  if (!s) return '';
  if (Array.isArray(s)) s = s[0];
  return String(s).toLowerCase().trim().replace(/\b([a-z])/g, c => c.toUpperCase());
}
function normPhone(s = '') {
  s = s.replace(/\D/g, '');
  if (s.startsWith('62')) s = '0' + s.slice(2);
  if (!s.startsWith('0')) s = '0' + s;
  return s;
}

function requireSantriAuth(req, res, next) {
  if (req.session?.user?.role === 'santri') return next();
  res.redirect('/?login=1&reason=required');
}

/* ============================================================
   MIDDLEWARE: Refresh Santri Session Status (Fix Badge Bug)
   ============================================================ */
async function refreshSantriSession(req, res, next) {
  if (req.session?.user?.role !== 'santri') return next();
  
  try {
    const email = req.session.user.email;
    if (!email) return next();
    
    // [FIX] Get fresh ACCOUNT status from tb_akun_santri
    const akunCheck = await pool.query(
      `SELECT status, alasan_tolak FROM tb_akun_santri WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (akunCheck.rows.length > 0) {
      req.session.user.status = akunCheck.rows[0].status;
      req.session.user.alasan_tolak = akunCheck.rows[0].alasan_tolak;
    }
    
    // Get fresh biodata status
    const santriCheck = await pool.query(
      `SELECT id, status_biodata, alasan_tolak FROM tb_santri WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (santriCheck.rows.length > 0) {
      const santriId = santriCheck.rows[0].id;
      req.session.user.santri_id = santriId;
      req.session.user.biodataVerified = santriCheck.rows[0].status_biodata === 'VERIFIED';
      req.session.user.biodataRejected = santriCheck.rows[0].status_biodata === 'REJECTED';
      req.session.user.biodataReason = santriCheck.rows[0].alasan_tolak;
      req.session.user.isBiodataEmpty = false;
      
      // Check payment status
      const verifiedCheck = await pool.query(
        `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'VERIFIED' LIMIT 1`,
        [santriId]
      );
      req.session.user.hasPaid = verifiedCheck.rows.length > 0;
      
      if (!req.session.user.hasPaid) {
        const pendingCheck = await pool.query(
          `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'PENDING' LIMIT 1`,
          [santriId]
        );
        req.session.user.paymentPending = pendingCheck.rows.length > 0;
        
        if (!req.session.user.paymentPending) {
           const rejectedCheck = await pool.query(
             `SELECT id, alasan_tolak FROM tb_pembayaran WHERE santri_id = $1 AND status = 'REJECTED' ORDER BY created_at DESC LIMIT 1`,
             [santriId]
           );
           if (rejectedCheck.rows.length > 0) {
              req.session.user.paymentRejected = true;
              req.session.user.paymentReason = rejectedCheck.rows[0].alasan_tolak;
           } else {
              req.session.user.paymentRejected = false;
              req.session.user.paymentReason = null;
           }
        }
      } else {
        req.session.user.paymentPending = false;
        req.session.user.paymentRejected = false;
      }
    } else {
      req.session.user.isBiodataEmpty = true;
      req.session.user.biodataVerified = false;
    }
  } catch (e) {
    console.log('[RefreshSantriSession] Error:', e.message);
  }
  
  next();
}

/* ============================================================
   ROUTE: LOGIN SANTRI (HANYA SANTRI)
   ============================================================ */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // HANYA CEK TABEL SANTRI
    const resSantri = await pool.query("SELECT * FROM tb_akun_santri WHERE email=$1", [email]);
    
    // Email tidak ditemukan
    if (resSantri.rows.length === 0) {
      return res.redirect('/?login=1&reason=notfound');
    }
    
    const s = resSantri.rows[0];
    
    // Password salah
    if (!(await bcrypt.compare(password, s.passhash))) {
      return res.redirect('/?login=1&reason=wrongpass');
    }
    
    // [MODIFIKASI] Cek Status Akun
    // Status PENDING & REJECTED sekarang DIBOLEHKAN masuk agar bisa cek status/alasan
    // if (s.status === 'PENDING') ...
    
    // if (s.status === 'REJECTED') {
    //   return res.redirect('/?login=1&reason=rejected&msg=' + encodeURIComponent(s.alasan_tolak || 'Data tidak valid'));
    // }

    // Cek Biodata dan statusnya
    const bioCheck = await pool.query("SELECT id, status_biodata, alasan_tolak FROM tb_santri WHERE email=$1", [s.email]);
    const isBiodataEmpty = bioCheck.rows.length === 0;
    const santriId = bioCheck.rows.length > 0 ? bioCheck.rows[0].id : null;
    const biodataVerified = bioCheck.rows.length > 0 && bioCheck.rows[0].status_biodata === 'VERIFIED';
    const biodataRejected = bioCheck.rows.length > 0 && bioCheck.rows[0].status_biodata === 'REJECTED';
    const biodataReason = bioCheck.rows.length > 0 ? bioCheck.rows[0].alasan_tolak : null;

    req.session.regenerate(() => {
      req.session.user = { 
        id: s.id, role: 'santri', name: s.nama, email: s.email, wa: s.wa,
        kelompok: s.kelompok, desa: s.desa, daerah: s.daerah,
        status: s.status, isBiodataEmpty: isBiodataEmpty,
        santri_id: santriId,
        biodataVerified: biodataVerified,
        biodataRejected: biodataRejected,
        biodataReason: biodataReason,
        alasan_tolak: s.alasan_tolak // Simpan alasan tolak AKUN ke session
      };
      res.redirect('/?toast=register_success'); 
    });

  } catch (e) {
    console.error(e);
    res.redirect('/?login=1&reason=error');
  }
});

/* ============================================================
   ROUTE: LOGIN ADMIN / PENGURUS (TERPISAH & RAHASIA)
   ============================================================ */
router.get('/panel-admin', (req, res) => {
  res.render('admin_login', { error: null });
});

router.post('/panel-admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const resPengurus = await pool.query("SELECT * FROM tb_pengurus WHERE email=$1", [email]);
    
    // Email tidak ditemukan
    if (resPengurus.rows.length === 0) {
      return res.render('admin_login', { error: 'Email belum terdaftar. Silakan daftar terlebih dahulu.' });
    }
    
    const u = resPengurus.rows[0];
    
    // Password salah
    if (!(await bcrypt.compare(password, u.passhash))) {
      return res.render('admin_login', { error: 'Password salah. Silakan coba lagi.' });
    }
    
    // Login berhasil
    req.session.regenerate(() => {
      req.session.user = { id: u.id, role: u.role, name: u.nama };
      res.redirect('/pengurus/home'); 
    });
  } catch (e) {
    console.error(e);
    res.render('admin_login', { error: 'Terjadi kesalahan sistem.' });
  }
});

/* ============================================================
   ROUTE: REGISTRASI SANTRI (AUTO LOGIN)
   ============================================================ */
router.get('/register', (req, res) => res.render('register', { title: 'Buat Akun Baru', error: null }));

router.post('/register', async (req, res) => {
  try {
    const { nama, email, password, wa, kelompok, desa, daerah, kampus, prodi } = req.body;
    
    // 1. Cek Email
    const check = await pool.query('SELECT id FROM tb_akun_santri WHERE email=$1', [email]);
    if (check.rows.length > 0) {
        return res.render('register', { title: 'Buat Akun', error: 'Email sudah terdaftar.' });
    }

    // 2. Cek Nama (tidak boleh duplikat)
    const nameCheck = await pool.query('SELECT id FROM tb_akun_santri WHERE LOWER(nama) = LOWER($1)', [nama.trim()]);
    if (nameCheck.rows.length > 0) {
        return res.render('register', { title: 'Buat Akun', error: 'Nama sudah digunakan. Silakan gunakan nama lain atau tambahkan inisial.' });
    }

    // 3. Hash Password & Insert
    // Kita gunakan RETURNING * agar bisa langsung ambil data untuk sesi
    const passhash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO tb_akun_santri (nama, email, passhash, wa, kelompok, desa, daerah, kampus, prodi, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING') 
       RETURNING *`,
      [toTitleCase(nama), email.toLowerCase(), passhash, normPhone(wa), kelompok, desa, daerah, kampus, prodi]
    );

    const newUser = result.rows[0];

    // 3. Email Notification
    const { sendEmail } = require('../utils/email'); // Import email util
    const emailSubject = 'Pendaftaran Akun PPM Nurul Hakim Berhasil';
    const emailBody = `
      <h3>Selamat Bergabung, ${toTitleCase(nama)}!</h3>
      <p>Akun Anda telah berhasil dibuat.</p>
      <p>Silakan login dan lengkapi biodata Anda untuk melanjutkan proses pendaftaran.</p>
      <br>
      <p>Terima Kasih,<br>Panitia PPM Nurul Hakim</p>
    `;
    // Fire and forget email
    sendEmail(email, emailSubject, emailBody).catch(console.error);

    // 4. AUTO LOGIN (Buat Sesi Langsung)
    // Ini langkah krusial agar user tidak perlu login ulang
    req.session.regenerate(() => {
      req.session.user = { 
        id: newUser.id, 
        role: 'santri', 
        name: newUser.nama, 
        email: newUser.email, 
        wa: newUser.wa,
        kelompok: newUser.kelompok, 
        kampus: newUser.kampus,
        prodi: newUser.prodi,
        desa: newUser.desa, 
        daerah: newUser.daerah,
        status: newUser.status, 
        isBiodataEmpty: true 
      };
      
      // 5. REDIRECT KE HOME DENGAN TOAST
      res.redirect('/?toast=register_success'); 
    });

  } catch (e) {
    console.error(e);
    res.render('register', { title: 'Error', error: 'Terjadi kesalahan sistem.' });
  }
});

/* ============================================================
   ROUTE: FORM BIODATA
   ============================================================ */
router.get('/form', requireSantriAuth, refreshSantriSession, async (req, res) => {
  // [PERBAIKAN] Cek status. Jika PENDING atau REJECTED, tolak akses.
  if (req.session.user.status === 'PENDING' || req.session.user.status === 'REJECTED') {
      return res.redirect('/?alert=not_verified');
  }

  try {
    const { rows } = await pool.query("SELECT * FROM tb_santri WHERE email = $1", [req.session.user.email]);
    res.render('form', {
      title: 'Formulir Biodata', user: req.session.user,
      data: rows.length > 0 ? rows[0] : {}, error: null
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("Gagal memuat data.");
  }
});

router.post('/form', requireSantriAuth, refreshSantriSession, upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'kk', maxCount: 1 },
  { name: 'ktp', maxCount: 1 },
  { name: 'sertifikat', maxCount: 1 }
]), async (req, res) => {
  if (req.session.user.status === 'PENDING' || req.session.user.status === 'REJECTED') {
    return res.redirect('/?alert=not_verified');
  }

  try {
    const b = req.body;
    const u = req.session.user;
    
    // Handle file uploads
    const fotoPath = req.files?.foto ? `/uploads/${req.files.foto[0].filename}` : b.old_foto;
    const kkPath = req.files?.kk ? `/uploads/${req.files.kk[0].filename}` : b.old_kk;
    const ktpPath = req.files?.ktp ? `/uploads/${req.files.ktp[0].filename}` : b.old_ktp;
    const sertifikatPath = req.files?.sertifikat ? `/uploads/${req.files.sertifikat[0].filename}` : b.old_sertifikat;

    // [AUTO CLEANUP] Hapus file lama jika ada file baru yang diupload
    try {
       const filesToCleanup = [];
       if (req.files?.foto && b.old_foto) filesToCleanup.push(b.old_foto);
       if (req.files?.kk && b.old_kk) filesToCleanup.push(b.old_kk);
       if (req.files?.ktp && b.old_ktp) filesToCleanup.push(b.old_ktp);
       if (req.files?.sertifikat && b.old_sertifikat) filesToCleanup.push(b.old_sertifikat);

       filesToCleanup.forEach(filePath => {
           // filePath format: "/uploads/filename.jpg". Join dengan folder public
           const absolutePath = path.join(__dirname, '../../public', filePath);
           if (fs.existsSync(absolutePath)) {
               fs.unlinkSync(absolutePath);
           }
       });
    } catch (err) {
       console.error('[CleanUp] Failed to unlink old files:', err.message);
    }
    
    const check = await pool.query("SELECT id FROM tb_santri WHERE email=$1", [u.email]);
    
    if (check.rows.length > 0) {
      // UPDATE - gunakan nama dari form (b.nama)
      // Reset status_biodata ke PENDING agar admin bisa cek ulang
      await pool.query(`UPDATE tb_santri SET nama=$1, jk=$2, wa=$3, pernah_mondok=$4, lulus_muballigh=$5, kelurahan=$6, kecamatan=$7, kota_kab=$8, provinsi=$9, no_ki=$10, kampus=$11, prodi=$12, jenjang=$13, angkatan=$14, ayah_nama=$15, ayah_pekerjaan=$16, ayah_penghasilan=$17, ayah_hp=$18, ibu_nama=$19, ibu_pekerjaan=$20, ibu_penghasilan=$21, ibu_hp=$22, kelompok=$23, desa=$24, daerah=$25, foto_path=COALESCE($26, foto_path), kk_path=COALESCE($27, kk_path), ktp_path=COALESCE($28, ktp_path), sertifikat_path=COALESCE($29, sertifikat_path), status_biodata='PENDING' WHERE email=$30`, 
      [toTitleCase(b.nama), b.jk, normPhone(b.wa), b.pernah_mondok === 'true', b.lulus_muballigh === 'true', b.kelurahan, b.kecamatan, b.kota_kab, b.provinsi, b.no_ki, b.kampus, b.prodi, b.jenjang, b.angkatan, b.ayah_nama, '', '', normPhone(b.ayah_hp), b.ibu_nama, '', '', normPhone(b.ibu_hp), b.kelompok, b.desa, b.daerah, req.files?.foto ? fotoPath : null, req.files?.kk ? kkPath : null, req.files?.ktp ? ktpPath : null, req.files?.sertifikat ? sertifikatPath : null, u.email]);
      
      // Update nama di tb_akun_santri juga
      await pool.query(`UPDATE tb_akun_santri SET nama=$1 WHERE email=$2`, [toTitleCase(b.nama), u.email]);
      
      // Update session
      req.session.user.santri_id = check.rows[0].id;
      req.session.user.name = toTitleCase(b.nama);
    } else {
      // INSERT - gunakan nama dari form (b.nama)
      const insertResult = await pool.query(`INSERT INTO tb_santri (nama, jk, email, wa, pernah_mondok, lulus_muballigh, kelurahan, kecamatan, kota_kab, provinsi, kelompok, desa, daerah, no_ki, kampus, prodi, jenjang, angkatan, ayah_nama, ayah_pekerjaan, ayah_penghasilan, ayah_hp, ibu_nama, ibu_pekerjaan, ibu_penghasilan, ibu_hp, foto_path, kk_path, ktp_path, sertifikat_path, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW()) RETURNING id`,
      [toTitleCase(b.nama), b.jk, u.email, normPhone(b.wa), b.pernah_mondok === 'true', b.lulus_muballigh === 'true', b.kelurahan, b.kecamatan, b.kota_kab, b.provinsi, b.kelompok, b.desa, b.daerah, b.no_ki, b.kampus, b.prodi, b.jenjang, b.angkatan, b.ayah_nama, '', '', normPhone(b.ayah_hp), b.ibu_nama, '', '', normPhone(b.ibu_hp), fotoPath, kkPath, ktpPath, sertifikatPath]);
      
      // Update nama di tb_akun_santri juga
      await pool.query(`UPDATE tb_akun_santri SET nama=$1 WHERE email=$2`, [toTitleCase(b.nama), u.email]);
      
      // Set santri_id from newly inserted record dan update session name
      req.session.user.santri_id = insertResult.rows[0].id;
      req.session.user.name = toTitleCase(b.nama);
    }

    req.session.user.isBiodataEmpty = false;
    // Reset rejection/verification flags since status is now PENDING
    req.session.user.biodataRejected = false;
    req.session.user.biodataVerified = false;
    req.session.user.biodataReason = null;
    res.redirect('/?toast=biodata_success');

  } catch (e) {
    console.error(e);
    res.render('form', { title: 'Formulir Biodata', user: req.session.user, data: req.body, error: 'Terjadi kesalahan sistem.' });
  }
});

// GET - Tampilkan form register pengurus
router.get('/panel-admin/register', (req, res) => {
  res.render('admin_register', { error: null });
});

// POST - Proses registrasi pengurus
router.post('/panel-admin/register', async (req, res) => {
  const { nama, email, password, role } = req.body;

  try {
    // 1. Cek Email
    const check = await pool.query("SELECT id FROM tb_pengurus WHERE email = $1", [email]);
    if (check.rows.length > 0) {
      return res.render('admin_register', { error: 'Email pengurus sudah terdaftar.' });
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert & Ambil Data User Baru (RETURNING *)
    // Kita butuh ID yang baru dibuat untuk session, makanya pakai RETURNING *
    const result = await pool.query(
      "INSERT INTO tb_pengurus (nama, email, passhash, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [nama, email, hashedPassword, role]
    );

    const newUser = result.rows[0];

    // 4. AUTO LOGIN (Buat Session)
    req.session.regenerate(() => {
      // Set session user sesuai struktur yang dipakai di middleware requireAuth
      req.session.user = { 
        id: newUser.id, 
        role: newUser.role, 
        name: newUser.nama 
      };

      // 5. Langsung Redirect ke Dashboard
      res.redirect('/pengurus/home');
    });

  } catch (e) {
    console.error(e);
    res.render('admin_register', { error: 'Terjadi kesalahan sistem saat registrasi.' });
  }
});

/* ============================================================
   PEMBAYARAN SHODAQOH OPERASIONAL (SANTRI)
   ============================================================ */
// GET - Tampilkan halaman pembayaran
router.get('/pembayaran', requireSantriAuth, refreshSantriSession, async (req, res) => {
  let history = [];
  let lastStatus = null; // Status pembayaran terakhir
  let pendingCount = 0;
  let verifiedCount = 0;
  let rejectedCount = 0;
  const success = req.query.success === '1';
  const error = req.query.error ? true : false;
  
  try {
    // Ambil riwayat pembayaran santri ini
    const { rows } = await pool.query(`
      SELECT 
        id,
        jumlah,
        to_char(created_at, 'DD Mon YYYY') AS tgl,
        status,
        keterangan,
        alasan_tolak
      FROM tb_pembayaran 
      WHERE santri_id = $1 
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.session.user.santri_id]);
    history = rows;
    
    // Hitung status
    if (rows.length > 0) {
      lastStatus = rows[0].status; // Status paling baru
      pendingCount = rows.filter(r => r.status === 'PENDING').length;
      verifiedCount = rows.filter(r => r.status === 'VERIFIED').length;
      rejectedCount = rows.filter(r => r.status === 'REJECTED').length;
    }
  } catch (e) {
    console.log('[Pembayaran] Tabel belum ada atau error:', e.message);
  }

  // Update session hasPaid based on verified payments
  req.session.user.hasPaid = verifiedCount > 0;

  res.render('pembayaran', {
    title: 'Shodaqoh Operasional',
    user: req.session.user,
    history,
    lastStatus,
    pendingCount,
    verifiedCount,
    rejectedCount,
    success,
    error
  });
});

// POST - Upload bukti pembayaran
router.post('/pembayaran', requireSantriAuth, refreshSantriSession, upload.single('bukti'), async (req, res) => {
  try {
    const santriId = req.session.user.santri_id;
    const buktiGambar = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Extract new form fields
    const namaPengirim = req.body.nama_pengirim || null;
    const namaBank = req.body.nama_bank || null;
    const nomorRekening = req.body.nomor_rekening || null;
    const tanggalTransfer = req.body.tanggal_transfer || null;
    
    if (!buktiGambar) {
      return res.redirect('/pembayaran?error=nobukti');
    }
    
    // Validasi santri_id harus ada (biodata harus sudah diisi)
    if (!santriId) {
      return res.redirect('/pembayaran?error=nobiodata');
    }
    
    // Validasi field wajib
    if (!namaBank || !nomorRekening || !tanggalTransfer) {
      return res.redirect('/pembayaran?error=incomplete');
    }

    // Insert ke tabel pembayaran dengan field baru
    await pool.query(`
      INSERT INTO tb_pembayaran (santri_id, nama_pengirim, nama_bank, nomor_rekening, tanggal_transfer, bukti_path, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW())
    `, [santriId, namaPengirim, namaBank, nomorRekening, tanggalTransfer, buktiGambar]);

    res.redirect('/pembayaran?toast=payment_success');
  } catch (e) {
    console.error('[POST /pembayaran] Error:', e.message);
    res.redirect('/pembayaran?error=db');
  }
});

/* ============================================================
   INFO SANTRI (Pengumuman, Peraturan, Perlengkapan)
   ============================================================ */
router.get('/info-santri', requireSantriAuth, refreshSantriSession, async (req, res) => {
  // Cek status - hanya user terverifikasi yang boleh akses
  if (req.session.user.status === 'PENDING' || req.session.user.status === 'REJECTED') {
    return res.redirect('/?alert=not_verified');
  }
  
  let cms = {};
  try {
    const { rows } = await pool.query(`SELECT * FROM tb_info_ppm ORDER BY id LIMIT 1`);
    if (rows[0]) {
      cms = rows[0];
      // Parse peraturan if it's a JSON string
      if (cms.peraturan && typeof cms.peraturan === 'string') {
        try {
          cms.peraturan = JSON.parse(cms.peraturan);
        } catch(e) {
          cms.peraturan = [];
        }
      }
      // Parse kontak_panitia if it's a JSON string
      if (cms.kontak_panitia && typeof cms.kontak_panitia === 'string') {
        try {
          cms.kontak_panitia = JSON.parse(cms.kontak_panitia);
        } catch(e) {
          cms.kontak_panitia = [];
        }
      }
      console.log('[Info Santri] kontak_panitia:', cms.kontak_panitia);
    }
  } catch (e) {
    console.log('[Info Santri] CMS error:', e.message);
  }
  
  res.render('info_santri', {
    title: 'Pengumuman & Info Santri',
    user: req.session.user,
    cms
  });
});

/* ============================================================
   API: GET SANTRI STATUS (Real-time update for badge)
   ============================================================ */
router.get('/api/santri-status', async (req, res) => {
  if (req.session?.user?.role !== 'santri') {
    return res.json({ error: 'not_logged_in' });
  }
  
  try {
    const email = req.session.user.email;
    let status = {
      isBiodataEmpty: true,
      biodataVerified: false,
      hasPaid: false,
      paymentPending: false,
      accountStatus: 'PENDING', // [FIX] Add account status
      accountRejectedReason: null
    };
    
    // [FIX] Get fresh ACCOUNT status from tb_akun_santri
    const akunCheck = await pool.query(
      `SELECT status, alasan_tolak FROM tb_akun_santri WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (akunCheck.rows.length > 0) {
      status.accountStatus = akunCheck.rows[0].status;
      status.accountRejectedReason = akunCheck.rows[0].alasan_tolak;
      req.session.user.status = akunCheck.rows[0].status;
      req.session.user.alasan_tolak = akunCheck.rows[0].alasan_tolak;
    }
    
    // Get fresh biodata status
    const santriCheck = await pool.query(
      `SELECT id, status_biodata, alasan_tolak FROM tb_santri WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (santriCheck.rows.length > 0) {
      const santriId = santriCheck.rows[0].id;
      status.isBiodataEmpty = false;
      status.biodataVerified = santriCheck.rows[0].status_biodata === 'VERIFIED';
      status.biodataRejected = santriCheck.rows[0].status_biodata === 'REJECTED';
      status.biodataReason = santriCheck.rows[0].alasan_tolak;
      
      // Update session
      req.session.user.santri_id = santriId;
      req.session.user.biodataVerified = status.biodataVerified;
      req.session.user.biodataRejected = status.biodataRejected;
      req.session.user.biodataReason = status.biodataReason;
      req.session.user.isBiodataEmpty = false;
      
      // Check payment status
      const verifiedCheck = await pool.query(
        `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'VERIFIED' LIMIT 1`,
        [santriId]
      );
      status.hasPaid = verifiedCheck.rows.length > 0;
      req.session.user.hasPaid = status.hasPaid;
      
      if (!status.hasPaid) {
        const pendingCheck = await pool.query(
          `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'PENDING' LIMIT 1`,
          [santriId]
        );
        status.paymentPending = pendingCheck.rows.length > 0;
        req.session.user.paymentPending = status.paymentPending;
      }
    }
    
    res.json(status);
  } catch (e) {
    console.log('[API santri-status] Error:', e.message);
    res.json({ error: 'db_error' });
  }
});

/* ============================================================
   EDIT AKUN (Untuk santri yang ditolak)
   ============================================================ */
// GET - Form edit data akun
router.get('/edit-akun', requireSantriAuth, async (req, res) => {
  // Hanya untuk akun yang REJECTED
  const email = req.session.user.email;
  
  try {
    const { rows } = await pool.query('SELECT * FROM tb_akun_santri WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.redirect('/');
    }
    
    const akun = rows[0];
    
    res.render('edit_akun', {
      title: 'Edit Data Akun',
      user: req.session.user,
      akun,
      error: null,
      success: req.query.success === '1'
    });
  } catch (e) {
    console.error('[GET /edit-akun] Error:', e.message);
    res.redirect('/');
  }
});

// POST - Simpan perubahan dan set status ke PENDING
router.post('/edit-akun', requireSantriAuth, async (req, res) => {
  const email = req.session.user.email;
  const { nama, wa, kelompok, desa, daerah } = req.body;
  
  try {
    // Update data akun dan reset status ke PENDING
    await pool.query(`
      UPDATE tb_akun_santri 
      SET nama = $1, wa = $2, kelompok = $3, desa = $4, daerah = $5, 
          status = 'PENDING', alasan_tolak = NULL
      WHERE email = $6
    `, [toTitleCase(nama), normPhone(wa), kelompok, desa, daerah, email]);
    
    // Update session
    req.session.user.name = toTitleCase(nama);
    req.session.user.wa = normPhone(wa);
    req.session.user.kelompok = kelompok;
    req.session.user.desa = desa;
    req.session.user.daerah = daerah;
    req.session.user.status = 'PENDING';
    req.session.user.alasan_tolak = null;
    
    console.log(`[Edit Akun] Akun ${email} diupdate dan status direset ke PENDING`);
    
    res.redirect('/?toast=akun_updated');
  } catch (e) {
    console.error('[POST /edit-akun] Error:', e.message);
    res.render('edit_akun', {
      title: 'Edit Data Akun',
      user: req.session.user,
      akun: req.body,
      error: 'Gagal menyimpan perubahan. Silakan coba lagi.',
      success: false
    });
  }
});

/* ============================================================
   LOGOUT
   ============================================================ */
router.get('/logout', (req, res) => {
  const role = req.session.user?.role;
  const isAdmin = ['admin', 'panitia', 'ketua', 'keuangan'].includes(role);
  req.session.destroy(() => {
    if (isAdmin) {
      res.redirect('/panel-admin');
    } else {
      res.redirect('/');
    }
  });
});

router.post('/logout', (req, res) => {
  const role = req.session.user?.role;
  const isAdmin = ['admin', 'panitia', 'ketua', 'keuangan'].includes(role);
  req.session.destroy(() => {
    if (isAdmin) {
      res.redirect('/panel-admin');
    } else {
      res.redirect('/');
    }
  });
});

module.exports = router;