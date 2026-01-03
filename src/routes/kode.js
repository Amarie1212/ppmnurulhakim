const express = require('express');
const router = express.Router();
const pool = require('../db');

// hanya pengurus/admin
function mustPengurus(req, res, next){
  const u = req.session?.user;
  if (!u || !['pengurus', 'admin'].includes(u.role)) {
    return res.redirect('/login?login=1&reason=required');
  }
  next();
}

/** GET: halaman Kelola Kode */
router.get('/pengurus/kode', mustPengurus, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT value, updated_by, updated_at FROM app_settings WHERE key='access_code'"
  );
  const current = rows[0] || { value: '', updated_by: '-', updated_at: new Date() };

  res.render('kode', {
    title: 'Kelola Kode',
    user: req.session.user,
    accessCode: current.value,
    meta: current,
    ok: req.query.ok === '1',   // untuk notifikasi sukses
    error: null
  });
});

/** POST: apply/ganti kode baru */
router.post('/pengurus/kode', mustPengurus, async (req, res) => {
  const raw = (req.body?.kode || '').toString().trim().toUpperCase();
  if (!raw) {
    const { rows } = await pool.query(
      "SELECT value, updated_by, updated_at FROM app_settings WHERE key='access_code'"
    );
    const current = rows[0] || { value: '', updated_by: '-', updated_at: new Date() };
    return res.render('kode', {
      title: 'Kelola Kode',
      user: req.session.user,
      accessCode: current.value,
      meta: current,
      ok: false,
      error: 'Kode tidak boleh kosong.'
    });
  }

  await pool.query(
    `INSERT INTO app_settings(key,value,updated_by,updated_at)
     VALUES ('access_code',$1,$2,now())
     ON CONFLICT (key) DO UPDATE
     SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()`,
    [raw, req.session.user?.name || 'pengurus']
  );

  // PRG pattern: Redirect supaya refresh tidak re-submit
  res.redirect('/pengurus/kode?ok=1');
});

/** POST: verifikasi kode dari modal di home.ejs */
router.post('/verify-code', async (req, res) => {
  try {
    const codeInput = (req.body?.code || '').toString().trim().toUpperCase();
    console.log('[verify-code] Input:', codeInput);

    const { rows } = await pool.query("SELECT value FROM app_settings WHERE key='access_code'");
    if (!rows.length) return res.json({ ok: false, error: 'Kode belum diset.' });

    const savedCode = (rows[0].value || '').toString().trim().toUpperCase();
    console.log('[verify-code] Saved:', savedCode);

    if (codeInput === savedCode) {
      console.log('[verify-code] MATCH ✅');
      req.session.allowedToRegister = true;
      req.session.usedCode = savedCode;
      return res.json({ ok: true, redirect: '/form' });
    } else {
      console.log('[verify-code] NOT MATCH ❌');
      return res.json({ ok: false, error: 'Kode tidak valid.' });
    }
  } catch (err) {
    console.error('[verify-code] ERROR:', err);
    res.json({ ok: false, error: 'Terjadi kesalahan server.' });
  }
});


module.exports = router;
