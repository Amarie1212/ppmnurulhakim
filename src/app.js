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
app.get('/logout', (req, res) => { req.session.destroy(()=>res.redirect('/')); });

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
    res.render('home', { title: 'PPM Nurul Hakim', cms });
});

// ===== Routes =====
app.use('/', require('./routes/kode'));      
app.use('/', require('./routes/public'));     
app.use('/', require('./routes/pengurus'));   
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/admin')); // <<< PENAMBAHAN FILE ADMIN ROUTE

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ready on :${PORT}`));