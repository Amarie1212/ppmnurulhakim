// Toast Notification System
// Add this script to pages that need toast notifications

function showToast(type, title, message, duration = 4000) {
  // Create toast container if not exists
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icon based on type
  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// Check for toast parameters in URL
(function() {
  const params = new URLSearchParams(window.location.search);
  const toastType = params.get('toast');
  const toastMsg = params.get('toast_msg');
  
  if (toastType) {
    const messages = {
      'register_success': { type: 'success', title: 'Registrasi Berhasil!', message: 'Akun Anda telah dibuat. Menunggu verifikasi admin.' },
      'login_success': { type: 'success', title: 'Login Berhasil!', message: 'Selamat datang kembali!' },
      'biodata_success': { type: 'success', title: 'Biodata Tersimpan!', message: 'Data Anda telah berhasil disimpan.' },
      'biodata_rejected': { type: 'error', title: 'Biodata Ditolak!', message: 'Biodata Anda ditolak oleh panitia. Silakan isi ulang formulir biodata.' },
      'payment_success': { type: 'success', title: 'Bukti Terkirim!', message: 'Bukti pembayaran berhasil diunggah.' },
      'verify_success': { type: 'success', title: 'Verifikasi Berhasil!', message: 'Data telah diverifikasi.' },
      'update_success': { type: 'success', title: 'Update Berhasil!', message: 'Data telah diperbarui.' },
      'delete_success': { type: 'success', title: 'Hapus Berhasil!', message: 'Data telah dihapus.' }
    };
    
    const toastData = messages[toastType];
    if (toastData) {
      setTimeout(() => {
        showToast(toastData.type, toastData.title, toastMsg || toastData.message);
      }, 100);
    }
  }
})();
