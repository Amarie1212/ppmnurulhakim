const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db'); 

const router = express.Router();

// --- Middleware: Hanya untuk Admin ---
function requireAdmin(req, res, next) {
    if (req.session?.user?.role === 'admin') {
        return next();
    }
    res.redirect('/pengurus/home'); 
}

// Fungsi bantu untuk hash password (dari public.js)
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Fungsi bantu untuk membuat password dari email
function createPasswordFromEmail(email) {
    // Password mengikuti nama email (bagian sebelum @)
    return email.split('@')[0]; 
}

/* ============================================================
    1. TAMPILKAN FORM DAN DAFTAR PENGURUS
    ============================================================ */
router.get('/pengurus/kelola-akun', requireAdmin, async (req, res) => {
    try {
        const { rows: pengurusList } = await pool.query(`
            SELECT id, nama, email, role, to_char(created_at, 'DD Mon YYYY') AS created_fmt
            FROM tb_pengurus 
            ORDER BY created_at DESC
        `);
        
        // Ambil pesan dari sesi (untuk success/error POST)
        const msg = req.session.message;
        delete req.session.message;

        res.render('kelola_akun', {
            title: 'Kelola Akun Pengurus',
            user: req.session.user,
            pengurus: pengurusList,
            error: msg?.type === 'error' ? msg.text : null,
            success: msg?.type === 'success' ? msg.text : null,
            roles: ['panitia', 'keuangan', 'ketua', 'admin'] // List role
        });
    } catch (e) {
        console.error('[GET /pengurus/kelola-akun] Error:', e.message);
        res.status(500).send("Gagal memuat halaman kelola akun.");
    }
});

/* ============================================================
    2. PROSES TAMBAH AKUN PENGURUS BARU
    ============================================================ */
router.post('/pengurus/kelola-akun/tambah', requireAdmin, async (req, res) => {
    const { nama, email, role } = req.body;
    const allowedRoles = ['admin', 'ketua', 'keuangan', 'panitia'];
    
    if (!allowedRoles.includes(role)) {
        req.session.message = { type: 'error', text: 'Role tidak valid.' };
        return res.redirect('/pengurus/kelola-akun');
    }

    try {
        // 1. Cek Email Sudah Terdaftar
        const check = await pool.query('SELECT id FROM tb_pengurus WHERE email=$1', [email.toLowerCase()]);
        if (check.rows.length > 0) {
            req.session.message = { type: 'error', text: 'Email sudah terdaftar di tabel pengurus.' };
            return res.redirect('/pengurus/kelola-akun');
        }

        // 2. Buat Password & Hash (Sesuai permintaan: menggunakan nama email)
        const rawPassword = createPasswordFromEmail(email.toLowerCase());
        const passhash = await hashPassword(rawPassword);
        
        // 3. Insert ke tb_pengurus
        await pool.query(
            `INSERT INTO tb_pengurus (nama, email, role, passhash, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [nama, email.toLowerCase(), role, passhash]
        );

        req.session.message = { type: 'success', text: `Akun ${nama} (${role}) berhasil dibuat. Password awal: ${rawPassword}` };
        return res.redirect('/pengurus/kelola-akun');

    } catch (e) {
        console.error('[POST /pengurus/kelola-akun/tambah] Error:', e.message);
        req.session.message = { type: 'error', text: 'Terjadi kesalahan sistem saat menyimpan data.' };
        return res.redirect('/pengurus/kelola-akun');
    }
});

/* ============================================================
    3. PROSES ADD AKUN PENGURUS (dari modal Tambah Pengurus)
    ============================================================ */
router.post('/pengurus/kelola-akun/add', requireAdmin, async (req, res) => {
    const { nama, email, password, role } = req.body;
    const allowedRoles = ['admin', 'ketua', 'keuangan', 'panitia'];
    
    if (!allowedRoles.includes(role)) {
        req.session.message = { type: 'error', text: 'Role tidak valid.' };
        return res.redirect('/pengurus/kelola-akun');
    }

    try {
        const check = await pool.query('SELECT id FROM tb_pengurus WHERE email=$1', [email.toLowerCase()]);
        if (check.rows.length > 0) {
            req.session.message = { type: 'error', text: 'Email sudah terdaftar.' };
            return res.redirect('/pengurus/kelola-akun');
        }

        const passhash = await hashPassword(password);
        await pool.query(
            `INSERT INTO tb_pengurus (nama, email, role, passhash, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [nama, email.toLowerCase(), role, passhash]
        );

        req.session.message = { type: 'success', text: `Akun ${nama} (${role}) berhasil dibuat.` };
        return res.redirect('/pengurus/kelola-akun');
    } catch (e) {
        console.error('[POST /kelola-akun/add] Error:', e.message);
        req.session.message = { type: 'error', text: 'Gagal menyimpan data.' };
        return res.redirect('/pengurus/kelola-akun');
    }
});

/* ============================================================
    4. PROSES EDIT AKUN PENGURUS
    ============================================================ */
router.post('/pengurus/kelola-akun/edit', requireAdmin, async (req, res) => {
    const { id, nama, email, password, role } = req.body;
    
    try {
        if (password && password.length >= 6) {
            const passhash = await hashPassword(password);
            await pool.query(
                `UPDATE tb_pengurus SET nama=$1, email=$2, role=$3, passhash=$4 WHERE id=$5`,
                [nama, email.toLowerCase(), role, passhash, id]
            );
        } else {
            await pool.query(
                `UPDATE tb_pengurus SET nama=$1, email=$2, role=$3 WHERE id=$4`,
                [nama, email.toLowerCase(), role, id]
            );
        }
        req.session.message = { type: 'success', text: `Akun ${nama} berhasil diperbarui.` };
    } catch (e) {
        console.error('[POST /kelola-akun/edit] Error:', e.message);
        req.session.message = { type: 'error', text: 'Gagal memperbarui data.' };
    }
    return res.redirect('/pengurus/kelola-akun');
});

/* ============================================================
    5. PROSES HAPUS AKUN PENGURUS
    ============================================================ */
router.post('/pengurus/kelola-akun/delete', requireAdmin, async (req, res) => {
    const { id } = req.body;
    
    // Jangan hapus diri sendiri
    if (parseInt(id) === req.session.user.id) {
        req.session.message = { type: 'error', text: 'Tidak bisa menghapus akun sendiri.' };
        return res.redirect('/pengurus/kelola-akun');
    }
    
    try {
        await pool.query('DELETE FROM tb_pengurus WHERE id=$1', [id]);
        req.session.message = { type: 'success', text: 'Akun berhasil dihapus.' };
    } catch (e) {
        console.error('[POST /kelola-akun/delete] Error:', e.message);
        req.session.message = { type: 'error', text: 'Gagal menghapus akun.' };
    }
    return res.redirect('/pengurus/kelola-akun');
});

/* ============================================================
    6. EXPORT LAPORAN PEMBAYARAN KE CSV/EXCEL
    ============================================================ */
/* ============================================================
    6. EXPORT LAPORAN PEMBAYARAN KE CSV/EXCEL
    ============================================================ */


/* ============================================================
    7. BACKUP DATABASE (PG_DUMP)
    ============================================================ */
router.get('/pengurus/backup-db', requireAdmin, (req, res) => {
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Config
    const dbUser = process.env.DB_USER || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbName = process.env.DB_NAME || 'ppmnurulhakim';
    // Password usually handled via .pgpass or PGPASSWORD env
    
    const filename = `backup_${dbName}_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/sql');

    // Run pg_dump
    // Ensure 'pg_dump' is in system PATH
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASS };
    
    const dump = spawn('pg_dump', ['-U', dbUser, '-h', dbHost, dbName], { env });

    dump.stdout.pipe(res);

    dump.stderr.on('data', (data) => {
        console.error(`[pg_dump] stderr: ${data}`);
    });

    dump.on('close', (code) => {
        if (code !== 0) {
            console.error(`[pg_dump] process exited with code ${code}`);
            // If headers verified sent, we can't really change response now
        } else {
            console.log('[pg_dump] Backup success');
        }
    });
});

module.exports = router;