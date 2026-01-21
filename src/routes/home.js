// routes/home.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  let cms = {};
  
  try {
    const { rows } = await pool.query(`SELECT * FROM tb_info_ppm ORDER BY id LIMIT 1`);
    cms = rows[0] || {};
  } catch (e) {
    console.log('[Home] CMS data error:', e.message);
  }

  // Check payment status and biodata status for santri user
  let hasPaid = false;
  let isBiodataEmpty = true;
  let paymentPending = false;
  let biodataVerified = false;
  
  if (req.session?.user?.role === 'santri') {
    try {
      // Get santri_id from session or from database
      let santriId = req.session.user.santri_id;
      
      // [FIX] Always get FRESH account status from tb_akun_santri
      if (req.session.user.email) {
        const akunCheck = await pool.query(
          `SELECT status, alasan_tolak FROM tb_akun_santri WHERE email = $1 LIMIT 1`,
          [req.session.user.email]
        );
        
        if (akunCheck.rows.length > 0) {
          // Update session with latest account status
          req.session.user.status = akunCheck.rows[0].status;
          req.session.user.alasan_tolak = akunCheck.rows[0].alasan_tolak;
        }
      }
      
      // Always get FRESH data from tb_santri to check status_biodata
      if (req.session.user.email) {
        const santriCheck = await pool.query(
          `SELECT id, status_biodata, alasan_tolak FROM tb_santri WHERE email = $1 LIMIT 1`,
          [req.session.user.email]
        );
        
        if (santriCheck.rows.length > 0) {
          santriId = santriCheck.rows[0].id;
          req.session.user.santri_id = santriId;
          // status_biodata = 'VERIFIED' means approved, 'REJECTED' means rejected
          biodataVerified = santriCheck.rows[0].status_biodata === 'VERIFIED';
          req.session.user.biodataRejected = santriCheck.rows[0].status_biodata === 'REJECTED';
          req.session.user.biodataReason = santriCheck.rows[0].alasan_tolak;
          isBiodataEmpty = false;
        } else {
          // Santri data not found (biodata empty)
          isBiodataEmpty = true;
        }
      }

      
      // Check payment if santri_id exists
      if (santriId) {
        // Check verified payment
        const verifiedCheck = await pool.query(
          `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'VERIFIED' LIMIT 1`,
          [santriId]
        );
        hasPaid = verifiedCheck.rows.length > 0;
        
        // Check pending payment (if not verified)
        if (!hasPaid) {
          const pendingCheck = await pool.query(
            `SELECT id FROM tb_pembayaran WHERE santri_id = $1 AND status = 'PENDING' LIMIT 1`,
            [santriId]
          );
          paymentPending = pendingCheck.rows.length > 0;
        }
      }
      
      console.log('[Home] Santri check:', { 
        email: req.session.user.email, 
        santriId, 
        isBiodataEmpty, 
        biodataVerified,
        hasPaid, 
        paymentPending 
      });
    } catch (e) {
      console.log('[Home] Payment check error:', e.message);
    }
  }

  // Update session with latest status
  if (req.session?.user) {
    req.session.user.hasPaid = hasPaid;
    req.session.user.isBiodataEmpty = isBiodataEmpty;
    req.session.user.paymentPending = paymentPending;
    req.session.user.biodataVerified = biodataVerified;
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

  res.render('home', { 
    title: 'PPM Nurul Hakim',
    user: req.session.user || null,
    cms,
    stat,
    currentPage: 'home'
  });
});

module.exports = router;
