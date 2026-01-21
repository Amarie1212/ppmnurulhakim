const express = require('express');
const router = express.Router();
const pool = require('../db');

// --- Middleware: Cek Login Pengurus/Admin (Disesuaikan) ---
function requireAuth(req, res, next) {
    // Role yang diizinkan: admin, ketua, keuangan, panitia
    if (req.session?.user && ['admin', 'ketua', 'keuangan', 'panitia'].includes(req.session.user.role)) {
        return next();
    }
    res.redirect('/panel-admin');
}

/* ============================================================
    1. HOME PENGURUS (LANDING PAGE - STATISTIK)
    ============================================================ */
router.get('/pengurus/home', requireAuth, async (req, res) => {
    try {
        // Ambil data statistik untuk kartu dashboard
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM tb_akun_santri WHERE status='PENDING') AS pending,
                (SELECT COUNT(*) FROM tb_santri WHERE status_biodata='PENDING') AS biodata_pending,
                (SELECT COUNT(*) FROM tb_pembayaran WHERE status='PENDING') AS payment_pending,
                (SELECT COUNT(*) FROM tb_santri) AS total_santri,
                (SELECT COUNT(*) FROM tb_santri WHERE jk='L') AS putra,
                (SELECT COUNT(*) FROM tb_santri WHERE jk='P') AS putri
        `);

        res.render('pengurus_home', {
            title: 'PPM Nurul Hakim / Beranda Pengurus',
            user: req.session.user,
            stat: stats.rows[0] || { pending: 0, biodata_pending: 0, payment_pending: 0, total_santri: 0, putra: 0, putri: 0 }
        });
    } catch (e) {
        console.error('[GET /pengurus/home] Error:', e.message);
        res.status(500).send("Gagal memuat halaman home.");
    }
});

/* ============================================================
    2. DASHBOARD DATA SANTRI (TABEL LENGKAP)
    ============================================================ */
// Akses: Admin, Ketua, Panitia (Keuangan biasanya tidak perlu akses penuh data santri)
router.get('/pengurus', requireAuth, async (req, res) => {
    if (req.session.user.role === 'keuangan') return res.redirect('/pengurus/keuangan'); // Redirect Keuangan

    try {
        // Menampilkan daftar santri yang sudah mengisi biodata lengkap
        const { rows: santri } = await pool.query(`
            SELECT 
                id, 
                nama, 
                CASE jk 
                    WHEN 'L' THEN 'Laki-laki' 
                    WHEN 'P' THEN 'Perempuan' 
                    ELSE '-' 
                END AS jk_label,
                wa AS phone, 
                to_char(created_at, 'DD Mon YYYY HH24:MI') AS created_fmt
            FROM tb_santri 
            ORDER BY created_at DESC 
            LIMIT 200
        `);

        res.render('pengurus', {
            title: 'PPM Nurul Hakim / Data Santri',
            user: req.session.user,
            santri
        });
    } catch (e) {
        console.error('[GET /pengurus] Error:', e.message);
        res.status(500).send('Terjadi kesalahan database.');
    }
});



/* ============================================================
    4. DETAIL SANTRI
    ============================================================ */
// Akses: Admin, Ketua, Panitia
router.get('/pengurus/santri/:id', requireAuth, async (req, res) => {
    if (req.session.user.role === 'keuangan') return res.redirect('/pengurus/keuangan');

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
            title: 'PPM Nurul Hakim / Detail Santri',
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
// Akses: Admin, Ketua
router.get('/pengurus/export.csv', requireAuth, async (req, res) => {
    if (!['admin', 'ketua'].includes(req.session.user.role)) {
        return res.status(403).send('Akses ditolak.'); // Hanya Admin/Ketua yang bisa export
    }

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
    6. [FITUR KEUANGAN] KELOLA PEMBAYARAN
    ============================================================ */
// Akses: Admin, Ketua (untuk lihat laporan), Keuangan
router.get('/pengurus/keuangan', requireAuth, async (req, res) => {
    try {
        const role = req.session.user.role;
        let laporan = [];

        // Laporan untuk Keuangan dan Ketua
        if (role === 'keuangan' || role === 'ketua') {
            laporan = [
                { id: 1, nama_santri: 'Budi Santoso', status: 'Menunggu Verifikasi', jumlah: 500000, tanggal: '2025-01-10' },
                { id: 2, nama_santri: 'Siti Aisyah', status: 'Terverifikasi', jumlah: 650000, tanggal: '2025-01-09' },
            ];
        }

        res.render('pengurus_keuangan', {
            title: 'PPM Nurul Hakim / Manajemen Keuangan',
            user: req.session.user,
            laporan,
            // Visibilitas tombol aksi diatur di EJS
        });

    } catch (e) {
        console.error('[GET /pengurus/keuangan] Error:', e.message);
        res.status(500).send("Gagal memuat halaman keuangan.");
    }
});

// Aksi Keuangan (Hanya Keuangan)
router.post('/pengurus/keuangan/verify', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'keuangan') return res.status(403).send('Akses ditolak.');
    // Logic verifikasi pembayaran...
    // Contoh: await pool.query("UPDATE tb_pembayaran SET status='VERIFIED' WHERE id=$1", [req.body.id]);
    res.redirect('/pengurus/keuangan?status=success_verify');
});

// Aksi Keuangan (Hanya Keuangan)
router.post('/pengurus/keuangan/reject', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'keuangan') return res.status(403).send('Akses ditolak.');
    // Logic tolak pembayaran...
    res.redirect('/pengurus/keuangan?status=success_reject');
});


module.exports = router;