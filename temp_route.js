router.get('/pengurus/laporan-santri', requireAuth, async (req, res) => {
  // AD-5, PN-5, KH-3: Admin, Panitia, Ketua boleh akses
  if (!['admin', 'panitia', 'ketua'].includes(req.session.user.role)) {
    return res.redirect('/pengurus/home');
  }

  try {
    const { rows: santri } = await pool.query(`
      SELECT 
        s.*,
        to_char(s.created_at, 'DD Mon YYYY HH24:MI') AS created_fmt
      FROM tb_santri s
      ORDER BY s.nama ASC
    `);

    res.render('laporan_santri', {
      title: 'Laporan Data Santri',
      user: req.session.user,
      santri
    });
  } catch (e) {
    console.error('[GET /pengurus/laporan-santri] Error:', e.message);
    res.status(500).send('Terjadi kesalahan database.');
  }
});
