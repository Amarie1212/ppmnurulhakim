// src/app.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();

// ===== View & static =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// ===== Body parsers (URUTAN PENTING) =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== Session =====
app.use(session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
}));

// ===== Expose user ke EJS =====
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ===== Dummy auth untuk tes cepat (boleh hapus) =====
// Login cepat di /login?as=admin atau ?as=pengurus
app.get('/login', (req, res) => {
    const as = (req.query.as || '').toLowerCase();
    // ROLE BARU DITAMBAHKAN DI SINI UNTUK DUMMY LOGIN:
    if (['admin', 'ketua', 'keuangan', 'panitia', 'pengurus'].includes(as)) {
        req.session.user = { id: 1, name: as.toUpperCase(), role: as };
        return res.redirect('/');
    }
    res.send('Tambahkan ?as=admin, ?as=ketua, ?as=keuangan, atau ?as=panitia untuk login dummy.');
});
// CATATAN: Route /logout sekarang ada di routes/public.js (dengan auto-delete akun REJECTED)

// ===== Home (pakai home.ejs kamu) =====
const pool = require('./db');
app.get('/', async (req, res) => {
    let cms = {};
    try {
        const { rows } = await pool.query(`SELECT * FROM tb_info_ppm ORDER BY id LIMIT 1`);
        cms = rows[0] || {};
    } catch (e) {
        console.log('[Home] CMS error:', e.message);
    }
    
    // [FIX] Refresh status akun santri dari database (agar update tanpa logout)
    if (req.session?.user?.role === 'santri' && req.session?.user?.email) {
        try {
            const akunCheck = await pool.query(
                `SELECT status, alasan_tolak FROM tb_akun_santri WHERE email = $1 LIMIT 1`,
                [req.session.user.email]
            );
            if (akunCheck.rows.length > 0) {
                req.session.user.status = akunCheck.rows[0].status;
                req.session.user.alasan_tolak = akunCheck.rows[0].alasan_tolak;
            }
            
            // Also refresh biodata status
            const santriCheck = await pool.query(
                `SELECT id, status_biodata, alasan_tolak FROM tb_santri WHERE email = $1 LIMIT 1`,
                [req.session.user.email]
            );
            if (santriCheck.rows.length > 0) {
                req.session.user.santri_id = santriCheck.rows[0].id;
                req.session.user.biodataVerified = santriCheck.rows[0].status_biodata === 'VERIFIED';
                req.session.user.biodataRejected = santriCheck.rows[0].status_biodata === 'REJECTED';
                req.session.user.biodataReason = santriCheck.rows[0].alasan_tolak;
                req.session.user.isBiodataEmpty = false;
                
                // Check payment status
                const payCheck = await pool.query(
                    `SELECT status FROM tb_pembayaran WHERE santri_id = $1 ORDER BY id DESC LIMIT 1`,
                    [santriCheck.rows[0].id]
                );
                if (payCheck.rows.length > 0) {
                    req.session.user.hasPaid = payCheck.rows[0].status === 'VERIFIED';
                    req.session.user.paymentPending = payCheck.rows[0].status === 'PENDING';
                    req.session.user.paymentRejected = payCheck.rows[0].status === 'REJECTED';
                } else {
                    req.session.user.hasPaid = false;
                    req.session.user.paymentPending = false;
                }
            } else {
                req.session.user.isBiodataEmpty = true;
            }
            
            // Update res.locals so EJS sees the changes
            res.locals.user = req.session.user;
        } catch (e) {
            console.log('[Home] Status refresh error:', e.message);
        }
    }
    
    // Fetch stat for pengurus (for red dot indicators)
    let stat = null;
    if (req.session?.user && ['admin', 'keuangan', 'ketua', 'panitia'].includes(req.session.user.role)) {
        try {
            const pendingAccount = await pool.query(`SELECT COUNT(*) FROM tb_akun_santri WHERE status = 'PENDING'`);
            const pendingBiodata = await pool.query(`SELECT COUNT(*) FROM tb_santri WHERE status_biodata = 'PENDING'`);
            const pendingPayment = await pool.query(`SELECT COUNT(*) FROM tb_pembayaran WHERE status = 'PENDING'`);
            
            stat = {
                pending: parseInt(pendingAccount.rows[0].count) || 0,
                biodata_pending: parseInt(pendingBiodata.rows[0].count) || 0,
                pending_payment: parseInt(pendingPayment.rows[0].count) || 0
            };
        } catch (e) {
            console.log('[Home] Stat fetch error:', e.message);
        }
    }
    
    res.render('home', { title: 'PPM Nurul Hakim', cms, stat, currentPage: 'home' });
});

// ===== Routes =====
app.use('/', require('./routes/kode'));      
app.use('/', require('./routes/public'));     
app.use('/', require('./routes/pengurus'));   
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/admin')); // <<< PENAMBAHAN FILE ADMIN ROUTE

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`ready on :${PORT}`));