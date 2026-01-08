const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Galeri upload storage
const galeriStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/galeri');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '_' + safe);
  }
});

const uploadGaleri = multer({
  storage: galeriStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('File harus gambar'));
    cb(null, true);
  }
});

// --- Middleware: Cek Login Pengurus/Admin ---
function requireAuth(req, res, next) {
  const allowedRoles = ['admin', 'panitia', 'ketua', 'keuangan'];
  if (req.session?.user && allowedRoles.includes(req.session.user.role)) {
    return next();
  }
  res.redirect('/panel-admin');
}

// --- Helper: Ambil Statistik Global (Badge Notifikasi) ---
async function getAdminStats() {
  try {
    const res = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tb_akun_santri WHERE status='PENDING') AS pending,
        (SELECT COUNT(*) FROM tb_pembayaran WHERE status='PENDING') AS pending_payment
    `);
    return res.rows[0] || { pending: 0, pending_payment: 0 };
  } catch (e) {
    console.error('[getAdminStats] Error:', e.message);
    return { pending: 0, pending_payment: 0 };
  }
}

// [DEBUG] Route sementara untuk cek data pembayaran di database
router.get('/pengurus/debug-pembayaran', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM tb_pembayaran ORDER BY created_at DESC LIMIT 10`);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

/* ============================================================
   1. HOME PENGURUS (LANDING PAGE - STATISTIK)
   ============================================================ */
router.get('/pengurus/home', requireAuth, async (req, res) => {
  try {
    // Ambil data statistik lengkap untuk dashboard
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tb_akun_santri WHERE status='PENDING') AS pending,
        (SELECT COUNT(*) FROM tb_santri WHERE status_biodata IS NULL OR status_biodata = 'PENDING') AS biodata_pending,
        (SELECT COUNT(*) FROM tb_santri) AS total_santri,
        (SELECT COUNT(*) FROM tb_santri WHERE jk='L') AS putra,
        (SELECT COUNT(*) FROM tb_santri WHERE jk='P') AS putri,
        (SELECT COUNT(*) FROM tb_pembayaran WHERE status='PENDING') AS pending_payment
    `);

    res.render('pengurus_home', {
      title: 'Beranda Pengurus',
      user: req.session.user,
      stat: stats.rows[0] || { pending: 0, biodata_pending: 0, total_santri: 0, putra: 0, putri: 0, pending_payment: 0 }
    });
  } catch (e) {
    console.error('[GET /pengurus/home] Error:', e.message);
    res.status(500).send("Gagal memuat halaman home.");
  }
});

/* ============================================================
   2. DASHBOARD DATA SANTRI (TABEL LENGKAP)
   ============================================================ */
router.get('/pengurus', requireAuth, async (req, res) => {
  try {
    const stat = await getAdminStats();

    // Menampilkan daftar santri yang sudah mengisi biodata lengkap
    // CATATAN: Menggunakan 'wa' sebagai 'phone' untuk menghindari error kolom 'telp'
    const { rows: santri } = await pool.query(`
      SELECT 
        id, 
        nama, 
        email,
        CASE jk 
          WHEN 'L' THEN 'Laki-laki' 
          WHEN 'P' THEN 'Perempuan' 
          ELSE '-' 
        END AS jk_label,
        wa AS phone, 
        angkatan,
        to_char(created_at, 'DD Mon YYYY HH24:MI') AS created_fmt
      FROM tb_santri 
      ORDER BY jk ASC, nama ASC 
      LIMIT 200
    `);

    res.render('pengurus', {
      title: 'Data Santri',
      user: req.session.user,
      santri,
      stat
    });
  } catch (e) {
    console.error('[GET /pengurus] Error:', e.message);
    res.status(500).send('Terjadi kesalahan database.');
  }
});

/* ============================================================
   2a. DELETE SANTRI (Admin & Panitia Only)
   ============================================================ */
router.post('/pengurus/santri/:id/delete', requireAuth, async (req, res) => {
  // Hanya admin dan panitia yang bisa hapus
  if (!['admin', 'panitia'].includes(req.session.user.role)) {
    return res.redirect('/pengurus');
  }
  
  const { id } = req.params;
  
  try {
    // Get santri data (email & files) first for cascading delete
    const santriResult = await pool.query('SELECT email, foto_path, kk_path, ktp_path, sertifikat_path FROM tb_santri WHERE id = $1', [id]);
    
    if (santriResult.rows.length > 0) {
      const s = santriResult.rows[0];
      const email = s.email;

      // [AUTO CLEANUP] Kumpulkan semua file yang akan dihapus
      const filesToDelete = [s.foto_path, s.kk_path, s.ktp_path, s.sertifikat_path];

      // Ambil juga file bukti pembayaran
      const payRes = await pool.query('SELECT bukti_path FROM tb_pembayaran WHERE santri_id = $1', [id]);
      payRes.rows.forEach(p => {
         if(p.bukti_path) filesToDelete.push(p.bukti_path);
      });

      // Hapus file fisik
      filesToDelete.forEach(filePath => {
          if (filePath) {
             // filePath misal: "/uploads/170000_foto.jpg"
             // path.join akan menggabungkan dengan benar
             const absolutePath = path.join(__dirname, '../../public', filePath);
             if (fs.existsSync(absolutePath)) {
                try { fs.unlinkSync(absolutePath); } catch(err) { console.error('Failed to unlink:', filePath, err.message); }
             }
          }
      });
      
      // Delete child records first (respects foreign key constraints)
      // Delete from tb_pembayaran first (has FK to tb_santri)
      await pool.query('DELETE FROM tb_pembayaran WHERE santri_id = $1', [id]);
      
      // Delete from tb_santri
      await pool.query('DELETE FROM tb_santri WHERE id = $1', [id]);
      
      // Also delete from tb_akun_santri if exists
      await pool.query('DELETE FROM tb_akun_santri WHERE email = $1', [email]);
      
      console.log(`[DELETE SANTRI] Santri ID ${id} (${email}) and all files deleted by ${req.session.user.name}`);
    }
     
    res.redirect('/pengurus');
  } catch (e) {
    console.error('[POST /pengurus/santri/:id/delete] Error:', e.message);
    res.redirect('/pengurus');
  }
});

/* ============================================================
   2b. DETAIL SANTRI BY ID (UNTUK VERIFIKASI BIODATA)
   ============================================================ */
router.get('/pengurus/santri/:id/detail', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get santri biodata lengkap
    const { rows } = await pool.query(`
      SELECT * FROM tb_santri WHERE id = $1 LIMIT 1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Santri tidak ditemukan');
    }
    
    const santri = rows[0];
    
    // Render detail page with verification context
    res.render('detail', {
      title: 'Detail Biodata - ' + santri.nama,
      user: req.session.user,
      s: santri,  // View uses 's' variable
      fromVerification: true  // Flag to show verification buttons
    });
  } catch (e) {
    console.error('[GET /pengurus/santri/:id/detail] Error:', e.message);
    res.status(500).send('Terjadi kesalahan database.');
  }
});

/* ============================================================
   2b. VERIFIKASI BIODATA (APPROVE/REJECT)
   ============================================================ */
router.post('/pengurus/biodata/verify', requireAuth, async (req, res) => {
  // Hanya admin dan panitia yang boleh
  if (!['admin', 'panitia'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }
  
  const { santri_id, action } = req.body;
  
  try {
    if (action === 'approve') {
      // Approve biodata - Set status_biodata = 'VERIFIED'
      await pool.query(`
        UPDATE tb_santri 
        SET status_biodata = 'VERIFIED'
        WHERE id = $1
      `, [santri_id]);
      
      console.log(`[Biodata Verify] Biodata santri ID ${santri_id} APPROVED`);
      res.redirect('/pengurus/verifikasi?tab=biodata&success=approved');
      
    } else if (action === 'reject') {
      // Reject biodata - Set status REJECTED dan simpan alasan
      // Data TIDAK DIHAPUS agar santri bisa perbaiki
      const { alasan } = req.body;
      await pool.query(`
        UPDATE tb_santri 
        SET status_biodata = 'REJECTED',
            alasan_tolak = $2
        WHERE id = $1
      `, [santri_id, alasan]);
      
      console.log(`[Biodata Verify] Biodata santri ID ${santri_id} REJECTED - reason: ${alasan}`);
      res.redirect('/pengurus/verifikasi?tab=biodata&success=rejected');
    } else {
      res.redirect('/pengurus/verifikasi?tab=biodata');
    }
  } catch (e) {
    console.error('[POST /pengurus/biodata/verify] Error:', e.message);
    res.redirect('/pengurus/verifikasi?tab=biodata&error=1');
  }
});



/* ============================================================
   2b. LAPORAN DATA SANTRI (Spreadsheet View)
   Akses: Admin, Panitia, Ketua
   ============================================================ */
router.get('/pengurus/laporan-santri', requireAuth, async (req, res) => {
  // Cek role - hanya admin, panitia, ketua
  if (!['admin', 'panitia', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.id, s.nama, s.jk, s.wa, s.email,
        s.kelompok, s.desa, s.daerah, s.alamat,
        s.sekolah_asal, s.nama_ayah, s.nama_ibu,
        s.status_biodata, s.angkatan, s.created_at
      FROM tb_santri s
      ORDER BY 
        CASE s.jk WHEN 'L' THEN 0 ELSE 1 END,
        s.nama ASC
    `);
    
    const stat = await getAdminStats();
    
    res.render('laporan_santri', {
      title: 'Laporan Data Santri',
      user: req.session.user,
      santri: rows,
      stat
    });
  } catch (e) {
    console.error('[GET /pengurus/laporan-santri] Error:', e.message);
    res.redirect('/pengurus/home');
  }
});

/* ============================================================
   2c. SPREADSHEET ONLINE (Google Sheets Embed)
   Akses: Admin, Panitia, Keuangan
   ============================================================ */
router.get('/pengurus/spreadsheet', requireAuth, async (req, res) => {
  // Cek role - hanya admin, panitia, keuangan
  if (!['admin', 'panitia', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }
  
  res.render('spreadsheet_online', {
    title: 'Spreadsheet Online',
    user: req.session.user
  });
});

/* ============================================================
   2c. EXPORT DATA SANTRI TO CSV
   Akses: Admin, Panitia, Ketua
   ============================================================ */
router.get('/pengurus/export-santri', requireAuth, async (req, res) => {
  // Cek role - hanya admin, panitia, ketua
  if (!['admin', 'panitia', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.nama,
        CASE s.jk WHEN 'L' THEN 'Laki-laki' WHEN 'P' THEN 'Perempuan' ELSE '-' END AS jenis_kelamin,
        s.wa AS no_whatsapp,
        s.email,
        s.kelompok,
        s.desa,
        s.daerah,
        s.kelurahan,
        s.kecamatan,
        s.kota_kab,
        s.provinsi,
        s.kampus,
        s.prodi,
        s.jenjang,
        s.angkatan,
        s.ayah_nama,
        s.ayah_hp,
        s.ibu_nama,
        s.ibu_hp,
        to_char(s.created_at, 'DD-MM-YYYY') AS tanggal_daftar
      FROM tb_santri s
      ORDER BY s.jk ASC, s.nama ASC
    `);

    // Build CSV content
    const headers = ['Nama', 'Jenis Kelamin', 'No WhatsApp', 'Email', 'Kelompok', 'Desa', 'Daerah', 'Kelurahan', 'Kecamatan', 'Kota/Kab', 'Provinsi', 'Kampus', 'Prodi', 'Jenjang', 'Angkatan', 'Nama Ayah', 'HP Ayah', 'Nama Ibu', 'HP Ibu', 'Tanggal Daftar'];
    
    let csv = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const values = [
        row.nama || '',
        row.jenis_kelamin || '',
        row.no_whatsapp || '',
        row.email || '',
        row.kelompok || '',
        row.desa || '',
        row.daerah || '',
        row.kelurahan || '',
        row.kecamatan || '',
        row.kota_kab || '',
        row.provinsi || '',
        row.kampus || '',
        row.prodi || '',
        row.jenjang || '',
        row.angkatan || '',
        row.ayah_nama || '',
        row.ayah_hp || '',
        row.ibu_nama || '',
        row.ibu_hp || '',
        row.tanggal_daftar || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csv += values.join(',') + '\n';
    });

    // Set headers for CSV download
    const filename = `data_santri_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support
  } catch (e) {
    console.error('[GET /pengurus/export-santri] Error:', e.message);
    res.redirect('/pengurus');
  }
});

/* ============================================================
   3. VERIFIKASI AKUN & PENDAFTARAN (2 TAB)
   ============================================================ */
// Tampilkan Tabel Akun Pending + Biodata Pending
router.get('/pengurus/verifikasi', requireAuth, async (req, res) => {
  try {
    // Tab 1: Akun Pending
    const akunResult = await pool.query(`
      SELECT 
        id, nama, email, wa, 
        kelompok, desa, daerah, 
        to_char(created_at, 'DD Mon HH24:MI') as created_fmt
      FROM tb_akun_santri 
      WHERE status = 'PENDING' 
      ORDER BY created_at ASC
    `);
    
    // Tab 2: Biodata Pending (santri yang sudah isi biodata tapi belum diverifikasi)
    let biodataRows = [];
    try {
      const biodataResult = await pool.query(`
        SELECT 
          s.id, s.nama, s.jk, s.no_ki,
          s.wa, s.email, s.kelompok,
          s.desa, s.daerah, s.kelurahan, s.kecamatan, s.kota_kab, s.provinsi,
          s.kampus, s.prodi, s.jenjang, s.angkatan,
          s.ayah_nama, s.ayah_hp, s.ibu_nama, s.ibu_hp,
          s.foto_path, s.kk_path, s.ktp_path, s.status_biodata,
          to_char(s.created_at, 'DD Mon HH24:MI') as created_fmt
        FROM tb_santri s
        JOIN tb_akun_santri a ON s.email = a.email
        WHERE a.status = 'VERIFIED' 
          AND s.nama IS NOT NULL
          AND (s.status_biodata = 'PENDING' OR s.status_biodata IS NULL)
        ORDER BY s.created_at ASC
      `);
      biodataRows = biodataResult.rows;
    } catch (bioErr) {
      // Column mungkin belum ada, skip dulu
      console.log('[Verifikasi] Biodata query skipped:', bioErr.message);
    }
    
    const stat = await getAdminStats();

    res.render('verifikasi', { 
      title: 'Verifikasi', 
      user: req.session.user, 
      akun: akunResult.rows,
      biodata: biodataRows,
      activeTab: req.query.tab || 'akun',
      stat
    });
  } catch (e) {
    console.error('[GET /verifikasi] Error:', e.message);
    res.send("Error memuat halaman verifikasi");
  }
});

// Proses Verifikasi Akun (Tab 1)
router.post('/pengurus/verifikasi', requireAuth, async (req, res) => {
  const { id, aksi } = req.body;
  try {
    if (aksi === 'verify') {
      await pool.query("UPDATE tb_akun_santri SET status='VERIFIED' WHERE id=$1", [id]);
    } else if (aksi === 'reject') {
      const { alasan } = req.body;
      await pool.query("UPDATE tb_akun_santri SET status='REJECTED', alasan_tolak=$2 WHERE id=$1", [id, alasan]);
    }
  } catch (e) {
    console.error('[POST /verifikasi] Error:', e.message);
  }
  res.redirect('/pengurus/verifikasi');
});

// Proses Verifikasi Biodata (Tab 2)
router.post('/pengurus/verifikasi-biodata', requireAuth, async (req, res) => {
  const { id, aksi } = req.body;
  // Note: This route seems unused or redundant with /pengurus/biodata/verify below?
  // Checking views/verifikasi.ejs, it posts to /pengurus/biodata/verify.
  // So I will ignore this one or update it just in case.
  try {
    if (aksi === 'verify') {
      await pool.query("UPDATE tb_santri SET status_biodata='VERIFIED' WHERE id=$1", [id]);
    }
  } catch (e) {
    console.error('[POST /verifikasi-biodata] Error:', e.message);
  }
  res.redirect('/pengurus/verifikasi?tab=biodata');
});

/* ============================================================
   4. DETAIL SANTRI
   ============================================================ */
router.get('/pengurus/santri/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT *, to_char(created_at,'DD Mon YYYY HH24:MI') AS created_fmt 
      FROM tb_santri WHERE id = $1 LIMIT 1
    `, [id]);

    const s = rows[0];
    if (!s) return res.status(404).send('Santri tidak ditemukan');

    s.jk_label = s.jk === 'L' ? 'Laki-laki' : (s.jk === 'P' ? 'Perempuan' : '—');
    s.phone = s.wa || '—';

    res.render('detail', {
      title: 'Detail Santri',
      user: req.session.user,
      s,
      fromVerification: false
    });
  } catch (e) {
    console.error('[GET /santri/:id] Error:', e.message);
    res.status(500).send('Terjadi kesalahan database.');
  }
});

/* ============================================================
   5. EXPORT CSV
   ============================================================ */
router.get('/pengurus/export.csv', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, nama,
        COALESCE(CASE jk WHEN 'L' THEN 'Laki-laki' WHEN 'P' THEN 'Perempuan' END, '') AS jenis_kelamin,
        COALESCE(wa, '') AS phone,
        kelompok, desa, daerah,
        to_char(created_at,'YYYY-MM-DD HH24:MI') AS created_fmt
      FROM tb_santri
      ORDER BY created_at DESC
    `);

    const header = 'id,nama,jenis_kelamin,telepon,kelompok,desa,daerah,tanggal\n';
    const body = rows.map(r =>
      [r.id, r.nama, r.jenis_kelamin, r.phone, r.kelompok, r.desa, r.daerah, r.created_fmt]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="data_santri.csv"');
    res.send(header + body);
  } catch (e) {
    console.error('[GET /export] Error:', e.message);
    res.status(500).send('Gagal export data.');
  }
});

/* ============================================================
   6. VERIFIKASI PEMBAYARAN
   ============================================================ */
// GET - Tampilkan daftar pembayaran yang perlu diverifikasi
router.get('/pengurus/verifikasi-pembayaran', requireAuth, async (req, res) => {
  // Hanya admin dan keuangan yang boleh akses
  if (!['admin', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  let pembayaran = [];
  let riwayat = [];
  
  try {
    // Query untuk ambil pembayaran pending
    const pending = await pool.query(`
      SELECT 
        p.id,
        COALESCE(s.nama, a.nama, 'Santri #' || p.santri_id::text) AS nama_santri,
        p.keterangan,
        p.bukti_path,
        to_char(p.created_at, 'DD Mon YYYY HH24:MI') AS tanggal_upload
      FROM tb_pembayaran p
      LEFT JOIN tb_santri s ON p.santri_id = s.id
      LEFT JOIN tb_akun_santri a ON s.email = a.email
      WHERE p.status = 'PENDING'
      ORDER BY p.created_at DESC
    `);
    pembayaran = pending.rows;
    
    // Query untuk ambil riwayat yang sudah diverifikasi (10 terakhir)
    const verified = await pool.query(`
      SELECT 
        p.id,
        COALESCE(s.nama, a.nama, 'Santri #' || p.santri_id::text) AS nama_santri,
        p.keterangan,
        to_char(p.created_at, 'DD Mon YYYY') AS tanggal_upload
      FROM tb_pembayaran p
      LEFT JOIN tb_santri s ON p.santri_id = s.id
      LEFT JOIN tb_akun_santri a ON s.email = a.email
      WHERE p.status = 'VERIFIED'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    riwayat = verified.rows;
    
    console.log('[Verifikasi Pembayaran] Pending:', pembayaran.length, 'Verified:', riwayat.length);
  } catch (e) {
    console.log('[Verifikasi Pembayaran] Error:', e.message);
  }

  const stat = await getAdminStats();

  res.render('verifikasi_pembayaran', {
    title: 'Verifikasi Pembayaran',
    user: req.session.user,
    pembayaran,
    riwayat,
    stat
  });
});

// POST - Terima pembayaran
router.post('/pengurus/verifikasi-pembayaran/verify', requireAuth, async (req, res) => {
  if (!['admin', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id } = req.body;
  console.log('[VERIFY] Attempting to verify payment ID:', id);
  
  try {
    // Update status menjadi VERIFIED (tanpa verified_at karena kolom tidak ada)
    const result = await pool.query(
      `UPDATE tb_pembayaran SET status = 'VERIFIED' WHERE id = $1 RETURNING *`,
      [id]
    );
    console.log('[VERIFY] Updated rows:', result.rowCount);
    res.redirect('/pengurus/verifikasi-pembayaran');
  } catch (e) {
    console.error('[POST /verify] Error:', e.message);
    res.redirect('/pengurus/verifikasi-pembayaran');
  }
});

// POST - Verifikasi pembayaran (unified endpoint)
router.post('/pengurus/verifikasi-pembayaran', requireAuth, async (req, res) => {
  if (!['admin', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id, aksi } = req.body;
  const { sendEmail } = require('../utils/email'); // Import email util
  
  try {
    // 1. Ambil data santri dulu sebelum update (untuk email)
    const santriResult = await pool.query(`
      SELECT s.nama, s.email 
      FROM tb_pembayaran p
      JOIN tb_santri s ON p.santri_id = s.id
      WHERE p.id = $1
    `, [id]);
    
    const santri = santriResult.rows[0];

    if (aksi === 'verify') {
      // Update status menjadi VERIFIED
      await pool.query(`UPDATE tb_pembayaran SET status = 'VERIFIED' WHERE id = $1`, [id]);
      
      // Kirim Email Diterima
      if (santri && santri.email) {
        sendEmail(
          santri.email,
          'Pembayaran Diterima - PPM Nurul Hakim',
          `
            <h3>Alhamdulillah, Pembayaran Diterima</h3>
            <p>Halo ${santri.nama},</p>
            <p>Pembayaran shodaqoh operasional Anda telah kami terima dan diverifikasi.</p>
            <p>Status akun Anda kini sudah <b>LUNAS / VERIFIED</b>.</p>
            <br>
            <p>Terima Kasih,<br>Bagian Keuangan PPM Nurul Hakim</p>
          `
        ).catch(console.error);
      }

    } else if (aksi === 'reject') {
      // Update status menjadi REJECTED dan simpan alasan
      const { alasan } = req.body;
      await pool.query(`UPDATE tb_pembayaran SET status = 'REJECTED', alasan_tolak = $2 WHERE id = $1`, [id, alasan]);
      
      // Kirim Email Ditolak
      if (santri && santri.email) {
        sendEmail(
          santri.email,
          'Pembayaran Ditolak - PPM Nurul Hakim',
          `
            <h3>Mohon Maaf, Pembayaran Ditolak</h3>
            <p>Halo ${santri.nama},</p>
            <p>Bukti pembayaran yang Anda kirimkan ditolak oleh admin.</p>
            <p>Alasan: <strong>${alasan || 'Data tidak sesuai'}</strong></p>
            <p>Mohon cek kembali bukti transfer Anda dan upload ulang melalui dashboard santri.</p>
            <br>
            <p>Terima Kasih,<br>Bagian Keuangan PPM Nurul Hakim</p>
          `
        ).catch(console.error);
      }
    }
    res.redirect('/pengurus/verifikasi-pembayaran');
  } catch (e) {
    console.error('[POST /verifikasi-pembayaran] Error:', e.message);
    res.redirect('/pengurus/verifikasi-pembayaran');
  }
});

// POST - Tolak pembayaran (hapus dari database)
router.post('/pengurus/verifikasi-pembayaran/reject', requireAuth, async (req, res) => {
  if (!['admin', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id } = req.body;
  try {
    // Hapus data pembayaran yang ditolak
    await pool.query(`DELETE FROM tb_pembayaran WHERE id = $1`, [id]);
    res.redirect('/pengurus/verifikasi-pembayaran');
  } catch (e) {
    console.error('[POST /reject] Error:', e.message);
    res.redirect('/pengurus/verifikasi-pembayaran');
  }
});

/* ============================================================
   7. LAPORAN PEMBAYARAN (YANG SUDAH DIVERIFIKASI)
   ============================================================ */
router.get('/pengurus/laporan-pembayaran', requireAuth, async (req, res) => {
  // Admin, keuangan, dan ketua boleh akses
  if (!['admin', 'keuangan', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  let pembayaran = [];
  let riwayat = [];
  let belumBayar = [];
  
  try {
    // Data pembayaran yang sudah diverifikasi
    const pembayaranResult = await pool.query(`
      SELECT 
        p.id,
        COALESCE(s.nama, a.nama, 'Santri #' || p.santri_id::text) AS nama_santri,
        p.keterangan,
        p.bukti_path,
        to_char(p.created_at, 'DD Mon YYYY') AS tanggal_upload
      FROM tb_pembayaran p
      LEFT JOIN tb_santri s ON p.santri_id = s.id
      LEFT JOIN tb_akun_santri a ON s.email = a.email
      WHERE p.status = 'VERIFIED'
      ORDER BY p.created_at DESC
    `);
    pembayaran = pembayaranResult.rows;
    
    // Data santri yang BELUM bayar (akun VERIFIED tapi tidak ada record di tb_pembayaran)
    const belumBayarResult = await pool.query(`
      SELECT 
        s.id,
        s.nama,
        a.wa
      FROM tb_santri s
      JOIN tb_akun_santri a ON s.email = a.email
      WHERE a.status = 'VERIFIED'
        AND NOT EXISTS (
          SELECT 1 FROM tb_pembayaran p WHERE p.santri_id = s.id
        )
      ORDER BY s.nama ASC
    `);
    belumBayar = belumBayarResult.rows;
    
    // Riwayat laporan yang sudah dikirim
    const riwayatResult = await pool.query(`
      SELECT 
        id,
        to_char(periode_mulai, 'DD Mon YYYY') AS periode_mulai,
        to_char(periode_akhir, 'DD Mon YYYY') AS periode_akhir,
        total_pembayaran,
        status,
        komentar_ketua,
        to_char(dibuat_at, 'DD Mon YYYY') AS dibuat_at
      FROM tb_laporan
      ORDER BY dibuat_at DESC
      LIMIT 20
    `);
    riwayat = riwayatResult.rows;
  } catch (e) {
    console.log('[Laporan Pembayaran] Error:', e.message);
  }

  const stat = await getAdminStats();

  res.render('laporan_pembayaran', {
    title: 'Laporan Pembayaran',
    user: req.session.user,
    pembayaran,
    belumBayar,
    riwayat,
    success: req.query.success === '1',
    error: req.query.error || null,
    stat
  });
});

/* ============================================================
   8a. KIRIM LAPORAN CEPAT (OTOMATIS)
   ============================================================ */
router.post('/pengurus/laporan-pembayaran/kirim', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'keuangan') {
    return res.redirect('/pengurus/home');
  }

  try {
    // Hitung total pembayaran terverifikasi
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM tb_pembayaran 
      WHERE status = 'VERIFIED'
    `);
    
    const totalPembayaran = parseInt(countResult.rows[0].total) || 0;
    
    if (totalPembayaran === 0) {
      return res.redirect('/pengurus/laporan-pembayaran?error=nodata');
    }
    
    // Get periode otomatis (dari pembayaran tertua hingga terbaru)
    const periodeResult = await pool.query(`
      SELECT 
        MIN(created_at)::date as periode_mulai,
        MAX(created_at)::date as periode_akhir
      FROM tb_pembayaran 
      WHERE status = 'VERIFIED'
    `);
    
    const { periode_mulai, periode_akhir } = periodeResult.rows[0];
    
    // Insert laporan baru
    await pool.query(`
      INSERT INTO tb_laporan (periode_mulai, periode_akhir, total_pembayaran, catatan, dibuat_oleh, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
    `, [
      periode_mulai, 
      periode_akhir, 
      totalPembayaran, 
      'Laporan pembayaran terverifikasi', 
      req.session.user.id
    ]);
    
    res.redirect('/pengurus/laporan-pembayaran?success=1');
  } catch (e) {
    console.error('[POST /laporan-pembayaran/kirim] Error:', e.message);
    res.redirect('/pengurus/laporan-pembayaran?error=' + encodeURIComponent(e.message));
  }
});

/* ============================================================
   8. SUBMIT LAPORAN KE KETUA
   ============================================================ */
router.post('/pengurus/laporan/submit', requireAuth, async (req, res) => {
  if (!['admin', 'keuangan'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { periode_mulai, periode_akhir, catatan } = req.body;
  
  try {
    // Hitung total pembayaran dalam periode
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM tb_pembayaran 
      WHERE status = 'VERIFIED' 
      AND created_at >= $1 AND created_at <= $2
    `, [periode_mulai, periode_akhir + ' 23:59:59']);
    
    const totalPembayaran = parseInt(countResult.rows[0].total) || 0;
    
    // Insert laporan baru
    await pool.query(`
      INSERT INTO tb_laporan (periode_mulai, periode_akhir, total_pembayaran, catatan, dibuat_oleh, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
    `, [periode_mulai, periode_akhir, totalPembayaran, catatan || null, req.session.user.id]);
    
    res.redirect('/pengurus/laporan-pembayaran?success=1');
  } catch (e) {
    console.error('[POST /laporan/submit] Error:', e.message);
    res.redirect('/pengurus/laporan-pembayaran?error=' + encodeURIComponent(e.message));
  }
});

/* ============================================================
   9. LAPORAN MASUK (UNTUK KETUA/ADMIN) - VERIFIED PAYMENTS ONLY
   ============================================================ */
router.get('/pengurus/laporan-masuk', requireAuth, async (req, res) => {
  // Hanya ketua dan admin yang boleh akses
  if (!['admin', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }
  
  try {
    // Get pembayaran yang sudah diverifikasi
    const { rows: pembayaran } = await pool.query(`
      SELECT 
        p.id AS pembayaran_id,
        p.bukti_path,
        s.nama AS nama_santri,
        to_char(p.created_at, 'DD Mon YYYY HH24:MI') AS tanggal_upload
      FROM tb_pembayaran p
      JOIN tb_santri s ON p.santri_id = s.id
      WHERE p.status = 'VERIFIED'
      ORDER BY p.created_at DESC
    `);

    const stat = await getAdminStats();

    res.render('laporan_masuk', {
      title: 'Laporan Pembayaran Masuk',
      user: req.session.user,
      pembayaran,
      stat
    });
  } catch (e) {
    console.error('[GET /pengurus/laporan-masuk] Error:', e.message);
    res.status(500).send('Terjadi kesalahan database.');
  }
});

// GET - Export Laporan Masuk ke Excel (Paid & Unpaid)
router.get('/pengurus/laporan-masuk/export-excel', requireAuth, async (req, res) => {
  if (!['admin', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const ExcelJS = require('exceljs');

  try {
    // 1. Fetch Data: Sudah Bayar (Verified)
    const paidResult = await pool.query(`
      SELECT 
        s.nama AS nama_santri,
        s.email,
        s.wa,
        s.kelompok,
        p.keterangan,
        to_char(p.created_at, 'DD-MM-YYYY HH24:MI') AS tanggal_bayar,
        p.status,
        p.jumlah
      FROM tb_pembayaran p
      JOIN tb_santri s ON p.santri_id = s.id
      WHERE p.status = 'VERIFIED'
      ORDER BY p.created_at DESC
    `);
    const paidData = paidResult.rows;

    // 2. Fetch Data: Belum Bayar
    // (Santri yg sudah verifikasi biodata TAPI belum ada record pembayaran VERIFIED/PENDING)
    // Note: Adjust logic if you want to include PENDING in "Belum Bayar" or separate sheet
    const unpaidResult = await pool.query(`
      SELECT 
        s.nama AS nama_santri,
        s.email,
        s.wa,
        s.kelompok,
        s.desa,
        to_char(s.created_at, 'DD-MM-YYYY') AS tgl_daftar
      FROM tb_santri s
      JOIN tb_akun_santri a ON s.email = a.email
      WHERE a.status = 'VERIFIED' -- Hanya akun yg aktif/approved
        AND NOT EXISTS (
          SELECT 1 FROM tb_pembayaran p 
          WHERE p.santri_id = s.id AND (p.status = 'VERIFIED' OR p.status = 'PENDING')
        )
      ORDER BY s.nama ASC
    `);
    const unpaidData = unpaidResult.rows;

    // 3. Create Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PPM Nurul Hakim';
    workbook.created = new Date();

    // --- SHEET 1: SUDAH BAYAR ---
    const sheet1 = workbook.addWorksheet('Sudah Bayar');
    sheet1.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Santri', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'WhatsApp', key: 'wa', width: 15 },
      { header: 'Kelompok', key: 'kelompok', width: 20 },
      { header: 'Keterangan', key: 'ket', width: 30 },
      { header: 'Tanggal Bayar', key: 'tgl', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Style Header
    sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }; // Green

    // Add Rows
    paidData.forEach((row, i) => {
      sheet1.addRow({
        no: i + 1,
        nama: row.nama_santri,
        email: row.email,
        wa: row.wa,
        kelompok: row.kelompok,
        ket: row.keterangan,
        tgl: row.tanggal_bayar,
        status: row.status
      });
    });

    // --- SHEET 2: BELUM BAYAR ---
    const sheet2 = workbook.addWorksheet('Belum Bayar');
    sheet2.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Santri', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'WhatsApp', key: 'wa', width: 15 },
      { header: 'Kelompok', key: 'kelompok', width: 20 },
      { header: 'Desa', key: 'desa', width: 20 },
      { header: 'Tgl Daftar', key: 'tgl', width: 15 }
    ];

    // Style Header
    sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'HHD9534F' } }; // Red-ish/Orange (Incorrect ARGB hex usually, using generic red FF C62828)
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC62828' } }; 

    // Add Rows
    unpaidData.forEach((row, i) => {
      sheet2.addRow({
        no: i + 1,
        nama: row.nama_santri,
        email: row.email,
        wa: row.wa,
        kelompok: row.kelompok,
        desa: row.desa,
        tgl: row.tgl_daftar
      });
    });

    // 4. Send Response
    const filename = `Laporan_Pembayaran_PPM_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (e) {
    console.error('[GET /pengurus/laporan-masuk/export-excel] Error:', e.message);
    res.redirect('/pengurus/laporan-masuk');
  }
});

// GET - Detail Laporan (lihat bukti pembayaran)
router.get('/pengurus/laporan-masuk/:id/detail', requireAuth, async (req, res) => {
  if (!['admin', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id } = req.params;
  
  try {
    // Get laporan info
    const laporanResult = await pool.query(`
      SELECT 
        l.id,
        to_char(l.periode_mulai, 'DD Mon YYYY') AS periode_mulai,
        to_char(l.periode_akhir, 'DD Mon YYYY') AS periode_akhir,
        l.total_pembayaran,
        l.catatan,
        COALESCE(p.nama, 'Pengurus #' || l.dibuat_oleh::text) AS nama_pembuat
      FROM tb_laporan l
      LEFT JOIN tb_pengurus p ON l.dibuat_oleh = p.id
      WHERE l.id = $1
    `, [id]);
    
    if (laporanResult.rows.length === 0) {
      return res.redirect('/pengurus/laporan-masuk');
    }
    
    const laporan = laporanResult.rows[0];
    
    // Get all verified payments (all time, since report is for all verified)
    const pembayaranResult = await pool.query(`
      SELECT 
        p.id,
        COALESCE(s.nama, 'Santri #' || p.santri_id::text) AS nama_santri,
        p.keterangan,
        p.bukti_path,
        to_char(p.created_at, 'DD Mon YYYY') AS tanggal
      FROM tb_pembayaran p
      LEFT JOIN tb_santri s ON p.santri_id = s.id
      WHERE p.status = 'VERIFIED'
      ORDER BY p.created_at DESC
    `);
    
    const pembayaran = pembayaranResult.rows;
    
    res.render('laporan_detail', {
      title: 'Detail Laporan',
      user: req.session.user,
      laporan,
      pembayaran
    });
  } catch (e) {
    console.error('[GET /laporan-masuk/:id/detail] Error:', e.message);
    res.redirect('/pengurus/laporan-masuk');
  }
});

/* ============================================================
   10. APPROVE LAPORAN
   ============================================================ */
router.post('/pengurus/laporan/approve', requireAuth, async (req, res) => {
  if (!['admin', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id, komentar } = req.body;
  
  try {
    await pool.query(`
      UPDATE tb_laporan 
      SET status = 'APPROVED', disetujui_oleh = $1, disetujui_at = NOW(), komentar_ketua = $2
      WHERE id = $3
    `, [req.session.user.id, komentar || null, id]);
    
    res.redirect('/pengurus/laporan-masuk');
  } catch (e) {
    console.error('[POST /laporan/approve] Error:', e.message);
    res.redirect('/pengurus/laporan-masuk');
  }
});

/* ============================================================
   11. REJECT LAPORAN
   ============================================================ */
router.post('/pengurus/laporan/reject', requireAuth, async (req, res) => {
  if (!['admin', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { id, komentar } = req.body;
  
  try {
    await pool.query(`
      UPDATE tb_laporan 
      SET status = 'REJECTED', disetujui_oleh = $1, disetujui_at = NOW(), komentar_ketua = $2
      WHERE id = $3
    `, [req.session.user.id, komentar, id]);
    
    res.redirect('/pengurus/laporan-masuk');
  } catch (e) {
    console.error('[POST /laporan/reject] Error:', e.message);
    res.redirect('/pengurus/laporan-masuk');
  }
});

/* ============================================================
   12. RIWAYAT LAPORAN
   ============================================================ */
router.get('/pengurus/riwayat-laporan', requireAuth, async (req, res) => {
  // Admin, keuangan, dan ketua boleh akses
  if (!['admin', 'keuangan', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const filter = req.query.status || null;
  let laporan = [];
  
  try {
    let query = `
      SELECT 
        l.id,
        to_char(l.periode_mulai, 'DD Mon YYYY') AS periode_mulai,
        to_char(l.periode_akhir, 'DD Mon YYYY') AS periode_akhir,
        l.total_pembayaran,
        l.status,
        l.komentar_ketua,
        to_char(l.dibuat_at, 'DD Mon YYYY') AS dibuat_at,
        COALESCE(p.nama, 'Pengurus #' || l.dibuat_oleh::text) AS nama_pembuat
      FROM tb_laporan l
      LEFT JOIN tb_pengurus p ON l.dibuat_oleh = p.id
    `;
    
    if (filter) {
      query += ` WHERE l.status = $1`;
      query += ` ORDER BY l.dibuat_at DESC`;
      const { rows } = await pool.query(query, [filter]);
      laporan = rows;
    } else {
      query += ` ORDER BY l.dibuat_at DESC`;
      const { rows } = await pool.query(query);
      laporan = rows;
    }
  } catch (e) {
    console.log('[Riwayat Laporan] Error:', e.message);
  }

  res.render('riwayat_laporan', {
    title: 'Riwayat Laporan',
    user: req.session.user,
    laporan,
    filter
  });
});

/* ============================================================
   13. KELOLA PENGUMUMAN (Admin + Panitia)
   ============================================================ */
// GET - Tampilkan form edit pengumuman
router.get('/pengurus/kelola-pengumuman', requireAuth, async (req, res) => {
  if (!['admin', 'panitia'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  let info = {};
  
  try {
    const { rows } = await pool.query(`SELECT * FROM tb_info_ppm ORDER BY id LIMIT 1`);
    info = rows[0] || {};
    
    // Parse JSON fields
    if (info.peraturan && typeof info.peraturan === 'string') {
      try { info.peraturan = JSON.parse(info.peraturan); } catch(e) { info.peraturan = []; }
    }
    if (info.kontak_panitia && typeof info.kontak_panitia === 'string') {
      try { info.kontak_panitia = JSON.parse(info.kontak_panitia); } catch(e) { info.kontak_panitia = []; }
    }
  } catch (e) {
    console.log('[Kelola Pengumuman] Tabel belum ada:', e.message);
  }

  res.render('kelola_pengumuman', {
    title: 'Kelola Pengumuman',
    user: req.session.user,
    info,
    success: req.query.success === '1'
  });
});

// POST - Simpan pengumuman
router.post('/pengurus/kelola-pengumuman', requireAuth, async (req, res) => {
  if (!['admin', 'panitia'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  const { pengumuman, tanggal_kedatangan, peraturan } = req.body;
  const peraturanJSON = peraturan ? JSON.stringify(peraturan.split('\n').filter(x => x.trim())) : '[]';
  
  // Debug: log form body to see what's coming in
  console.log('[Kelola Pengumuman] req.body keys:', Object.keys(req.body));
  
  // Build kontak_panitia array from form arrays
  // Check both possible property names
  const kontakTipe = req.body['kontak_tipe[]'] || req.body['kontak_tipe'] || [];
  const kontakLabel = req.body['kontak_label[]'] || req.body['kontak_label'] || [];
  const kontakValue = req.body['kontak_value[]'] || req.body['kontak_value'] || [];
  
  console.log('[Kelola Pengumuman] kontakTipe:', kontakTipe);
  console.log('[Kelola Pengumuman] kontakValue:', kontakValue);
  
  const kontakPanitia = [];
  const tipeArr = Array.isArray(kontakTipe) ? kontakTipe : (kontakTipe ? [kontakTipe] : []);
  const labelArr = Array.isArray(kontakLabel) ? kontakLabel : (kontakLabel ? [kontakLabel] : []);
  const valueArr = Array.isArray(kontakValue) ? kontakValue : (kontakValue ? [kontakValue] : []);
  
  for (let i = 0; i < tipeArr.length; i++) {
    if (valueArr[i] && valueArr[i].trim()) {
      kontakPanitia.push({
        tipe: tipeArr[i] || 'whatsapp',
        label: labelArr[i] || '',
        value: valueArr[i].trim()
      });
    }
  }
  console.log('[Kelola Pengumuman] kontakPanitia to save:', kontakPanitia);
  const kontakPanitiaJSON = JSON.stringify(kontakPanitia);
  
  try {
    const check = await pool.query(`SELECT id FROM tb_info_ppm LIMIT 1`);
    
    if (check.rows.length > 0) {
      await pool.query(`
        UPDATE tb_info_ppm SET 
          pengumuman = $1,
          tanggal_kedatangan = $2,
          peraturan = $3,
          kontak_panitia = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [pengumuman, tanggal_kedatangan || null, peraturanJSON, kontakPanitiaJSON, check.rows[0].id]);
    } else {
      await pool.query(`
        INSERT INTO tb_info_ppm (pengumuman, tanggal_kedatangan, peraturan, kontak_panitia)
        VALUES ($1, $2, $3, $4)
      `, [pengumuman, tanggal_kedatangan || null, peraturanJSON, kontakPanitiaJSON]);
    }
    
    res.redirect('/pengurus/kelola-pengumuman?success=1');
  } catch (e) {
    console.error('[POST /kelola-pengumuman] Error:', e.message);
    res.redirect('/pengurus/kelola-pengumuman');
  }
});

module.exports = router;
