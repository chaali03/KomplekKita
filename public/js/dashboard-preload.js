/**
 * Dashboard Data Preloader
 * Loads dashboard data immediately to prevent showing zeros on page load
 * Supports per-user/device data persistence for demo mode
 */

console.log('[Dashboard Preload] Starting immediate data load...');

// Generate a unique device ID if not exists
function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device_id', deviceId);
    console.log('[Dashboard Preload] Created new device ID:', deviceId);
  }
  return deviceId;
}

// Apply snapshot values to Admin Dashboard KPI elements immediately if present
function applyDashboardKPIs() {
  try {
    const snap = JSON.parse(localStorage.getItem('laporan_totals_snapshot') || 'null');
    if (!snap) return;
    
    // Format function that handles zero and null/undefined values correctly
    const fmt = (n) => {
      const num = Number(n || 0);
      if (num === 0) return 'Rp 0';
      
      try { 
        return new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR', 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }).format(num);
      } catch { 
        return `Rp ${num.toLocaleString('id-ID')}`; 
      }
    };
    
    const elKas = document.getElementById('dash-total-kas');
    const elMasuk = document.getElementById('dash-total-masuk');
    const elKeluar = document.getElementById('dash-total-keluar');
    
    // Ensure we have valid numbers
    const bal = Math.max(0, Number(snap.totals?.balance ?? 0));
    const inc = Math.max(0, Number(snap.totals?.income ?? 0));
    const exp = Math.max(0, Number(snap.totals?.expense ?? 0));
    
    // Update elements only if they exist
    const updateElement = (el, value) => {
      if (!el) return;
      el.textContent = fmt(value);
      el.setAttribute('data-target', String(value));
      el.dataset.value = String(value);
    };
    
    updateElement(elKas, bal);
    updateElement(elMasuk, inc);
    updateElement(elKeluar, exp);

    // Calculate 'Tertunda' (pending dues) based on current period config and payments
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const readJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fb; } catch { return fb; } };
    const cfgs = readJSON('dues_configs', {});
    const cfg = (cfgs && cfgs[ym]) || readJSON('dues_config', {});
    const nominal = Number((cfg && cfg.amount) || 0) || 0;
    // Get all residents data
    const warga = readJSON('warga_data_v1', []);
    const demo = readJSON('residents_data', []);
    const residents = Array.isArray(warga) && warga.length > 0 ? warga : Array.isArray(demo) ? demo : [];
    
    // Filter active residents
    const activeResidents = residents.filter(r => r && (r.status === 'aktif' || typeof r.status === 'undefined'));
    
    // Get paid residents for current month
    const pays = readJSON('dues_payments', {});
    const currentMonthPaid = Array.isArray(pays?.[ym]?.paid) ? pays[ym].paid : [];
    
    // Debug log
    console.log('Total warga aktif:', activeResidents.length);
    console.log('Sudah bayar:', currentMonthPaid.length);
    
    // Calculate unpaid residents (those not in the paid list)
    const unpaidResidents = activeResidents.filter(resident => {
      // Pastikan resident memiliki ID yang valid
      if (!resident || !resident.id) return false;
      
      // Cek apakah ID resident ada di daftar yang sudah bayar
      const hasPaid = currentMonthPaid.some(paid => {
        // Pastikan data pembayaran valid
        if (!paid || !paid.id) return false;
        return String(paid.id) === String(resident.id);
      });
      
      return !hasPaid;
    });
    
    console.log('Belum bayar:', unpaidResidents.length);
    
    // Calculate pending amount
    const unpaidCount = Math.max(0, unpaidResidents.length);
    const pendingAmount = Math.max(0, nominal * unpaidCount);
    
    console.log('Nominal per warga:', nominal);
    console.log('Total tertunda:', pendingAmount);
    
    // Update the UI
    const elPending = document.getElementById('dash-iuran-pending');
    if (elPending) {
      // Set initial value to 0 for animation
      if (!elPending.hasAttribute('data-animated')) {
        elPending.textContent = 'Rp 0';
        elPending.setAttribute('data-animated', 'true');
      }

      // Only animate if the value has changed
      const currentValue = parseFloat(elPending.getAttribute('data-value') || '0');
      if (currentValue !== pendingAmount) {
        // Update data attributes
        elPending.setAttribute('data-target', String(pendingAmount));
        elPending.dataset.value = String(pendingAmount);
        
        // Use the enhanced animation if available
        if (window.animateCurrency) {
          window.animateCurrency(elPending, pendingAmount, {
            duration: 1000,
            easing: 'easeOutCubic',
            currency: 'IDR',
            precision: 0,
            onComplete: () => {
              // Ensure final value is set correctly
              const finalValue = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(pendingAmount);
              elPending.textContent = finalValue;
            }
          });
        } else {
          // Fallback: set the final value directly
          const finalValue = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(pendingAmount);
          elPending.textContent = finalValue;
        }
      }
    }
  } catch (_) { /* noop */ }
}

// One-time deterministic demo seeding and lock
async function seedDemoDataOnce() {
  try {
    const LOCK = 'demo_seed_locked_v1';
    if (localStorage.getItem(LOCK) === '1') return; // already seeded
    const txKey = 'financial_transactions_v2';
    const snapKey = 'laporan_totals_snapshot';
    const kpiKey = 'summary_kpis';
    const hasTx = !!localStorage.getItem(txKey);
    const hasSnap = !!localStorage.getItem(snapKey);
    const hasKpi = !!localStorage.getItem(kpiKey);
    if (hasTx && hasSnap && hasKpi) { localStorage.setItem(LOCK, '1'); return; }

    // Load canonical demo data from public if transactions missing
    let txs = [];
    if (!hasTx) {
      try {
        const res = await fetch('/data/initial-transactions.json', { cache: 'no-store' });
        if (res.ok) txs = await res.json();
      } catch (_) { /* ignore */ }
      if (!Array.isArray(txs)) txs = [];
      localStorage.setItem(txKey, JSON.stringify(txs));
    } else {
      txs = JSON.parse(localStorage.getItem(txKey) || '[]');
    }

    // Compute totals deterministically
    const totals = txs.reduce((acc, t) => {
      const amt = Number(t?.amount || 0);
      if (t?.type === 'Masuk') acc.income += amt; else if (t?.type === 'Keluar') acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
    totals.balance = totals.income - totals.expense;

    // Seed snapshot if missing
    if (!hasSnap) {
      const snap = { totals, period: { preset: 'bulan-ini' }, ts: Date.now() };
      localStorage.setItem(snapKey, JSON.stringify(snap));
    }
    // Seed summary KPIs if missing
    if (!hasKpi) {
      const summary = { totalKas: totals.balance, totalMasuk: totals.income, totalKeluar: totals.expense };
      localStorage.setItem(kpiKey, JSON.stringify(summary));
    }
    localStorage.setItem(LOCK, '1');
  } catch (_) { /* noop */ }
}

// Kick off immediately: seed demo deterministically once, then write default snapshot only if still missing
seedDemoDataOnce().finally(() => { try { ensureImmediateDefaultSnapshot(); } catch (_) {} });

// Ensure KPIs update when DOM ready (so elements exist)
function initDashboard() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof applyTransaksiKPIs === 'function') applyTransaksiKPIs();
      if (typeof applyDashboardKPIs === 'function') applyDashboardKPIs();
    });
  } else {
    if (typeof applyTransaksiKPIs === 'function') applyTransaksiKPIs();
    if (typeof applyDashboardKPIs === 'function') applyDashboardKPIs();
  }
}

// Initialize dashboard
initDashboard();

// React to storage changes and tab visibility to keep KPIs in sync
try {
  window.addEventListener('storage', (e) => {
    if (!e || !e.key) return;
    if (e.key === 'laporan_totals_snapshot' || e.key === 'financial_transactions_v2') {
      applyTransaksiKPIs();
      applyDashboardKPIs();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { applyTransaksiKPIs(); applyDashboardKPIs(); }
  });
} catch (_) { /* noop */ }
// Apply snapshot values to Admin Transaksi KPI elements immediately if present
function applyTransaksiKPIs() {
  try {
    const snap = JSON.parse(localStorage.getItem('laporan_totals_snapshot') || 'null');
    const txs = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
    const fmt = (n) => {
      try { return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(n||0)); }
      catch { return `Rp ${Number(n||0).toLocaleString('id-ID')}`; }
    };
    if (!snap) return;
    const elSaldo = document.getElementById('kpi-saldo');
    const elMasuk = document.getElementById('kpi-masuk');
    const elKeluar = document.getElementById('kpi-keluar');
    const elCount = document.getElementById('kpi-count');
    if (elSaldo) elSaldo.textContent = fmt(snap.totals?.balance ?? 0);
    if (elMasuk) elMasuk.textContent = fmt(snap.totals?.income ?? 0);
    if (elKeluar) elKeluar.textContent = fmt(snap.totals?.expense ?? 0);
    if (elCount) elCount.textContent = String(Array.isArray(txs) ? txs.length : 0);
  } catch (_) { /* noop */ }
}

// Immediate default snapshot to avoid any zero flash
function ensureImmediateDefaultSnapshot() {
  try {
    if (localStorage.getItem('laporan_totals_snapshot')) return false;
    const defaults = { totals: { balance: -40000, income: 2200000, expense: 1100000 } };
    localStorage.setItem('laporan_totals_snapshot', JSON.stringify(defaults));
    return true;
  } catch (_) { return false; }
}

// Get device-specific storage key
function getDeviceKey(baseKey) {
  const deviceId = getDeviceId();
  return `${baseKey}_${deviceId}`;
}

// Currency formatter
function fmtIDR(val) {
  try {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      maximumFractionDigits: 0 
    }).format(Number(val || 0));
  } catch (_) {
    return `Rp${Number(val || 0).toLocaleString('id-ID')}`;
  }
}

// Compute totals from transactions
function computeTotals(tx) {
  try {
    const arr = Array.isArray(tx) ? tx : [];
    let income = 0, expense = 0;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      if (!t || typeof t.amount !== 'number') continue;
      if (t.type === 'Masuk') income += t.amount; else if (t.type === 'Keluar') expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  } catch (_) { return { income: 0, expense: 0, balance: 0 }; }
}

// Ensure laporan snapshot exists from available sources (sync)
function ensureLaporanSnapshotSync() {
  try {
    const existing = localStorage.getItem('laporan_totals_snapshot');
    if (existing) return false;
    const tx = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
    if (Array.isArray(tx) && tx.length > 0) {
      const totals = computeTotals(tx);
      localStorage.setItem('laporan_totals_snapshot', JSON.stringify({ totals }));
      return true;
    }
  } catch (_) {}
  return false;
}

// Try to fetch server demo data if nothing exists yet (async background)
async function ensureSnapshotFromServerDemo() {
  try {
    const hasSnapshot = !!localStorage.getItem('laporan_totals_snapshot');
    const tx = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
    if (hasSnapshot || (Array.isArray(tx) && tx.length > 0)) return false;
    const res = await fetch('/data/initial-transactions.json', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem('financial_transactions_v2', JSON.stringify(data));
      const totals = computeTotals(data);
      localStorage.setItem('laporan_totals_snapshot', JSON.stringify({ totals }));
      return true;
    }
  } catch (_) { /* noop */ }
  return false;
}

// Main data loading function
function loadDashboardDataImmediately() {
  try {
    console.log('[Dashboard Preload] Loading data from localStorage...');
    // First-visit detection for Admin dashboard
    function isFirstVisitAdmin() {
      try {
        const key = 'visited_admin_dashboard';
        const visited = localStorage.getItem(key) === 'true';
        if (!visited) { localStorage.setItem(key, 'true'); return true; }
        return false;
      } catch (_) { return false; }
    }
    const firstVisit = isFirstVisitAdmin();
    // Purge legacy wrong data (balance 3,200,000) from any stored payloads
    (function purgeLegacyKas() {
      try {
        const suspectValues = [3200000, '3200000', '3200000.0'];
        const keysToCheck = [
          'summary_kpis',
          'laporan_totals_snapshot',
          'financial_transactions_v2',
        ];
        // include device-specific keys
        try {
          const deviceId = localStorage.getItem('device_id');
          if (deviceId) {
            keysToCheck.push(`user_dashboard_data_${deviceId}`);
            keysToCheck.push(`laporan_totals_snapshot_${deviceId}`);
          }
        } catch(_) {}

        for (const k of keysToCheck) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          try {
            const obj = JSON.parse(raw);
            const balance = obj?.totals?.balance ?? obj?.totalKas ?? null;
            if (suspectValues.includes(balance)) {
              localStorage.removeItem(k);
              console.log('[Dashboard Preload] Purged legacy key with wrong kas:', k);
            }
          } catch(_) {
            // If plain value equals suspect, remove as well
            if (suspectValues.includes(raw)) {
              localStorage.removeItem(k);
              console.log('[Dashboard Preload] Purged legacy string value key:', k);
            }
          }
        }
      } catch(_) {}
    })();
    // Write an immediate default snapshot if still empty to avoid zero flash on mobile/tab
    ensureImmediateDefaultSnapshot();
    // Proactively ensure snapshot so first visit never shows zeros on static hosting
    const createdSync = ensureLaporanSnapshotSync();
    // Fire-and-forget server demo load if still empty; will refresh later
    ensureSnapshotFromServerDemo().then((changed) => { if (changed) { try { loadDashboardDataImmediately(); } catch (_) {} } });

    // Check if user has custom data
    const userDataKey = getDeviceKey('user_dashboard_data');
    const userData = JSON.parse(localStorage.getItem(userDataKey) || 'null');
    
    // Get data from localStorage - PRIORITASKAN DATA DARI LAPORAN
  const lapDataKey = getDeviceKey('laporan_totals_snapshot');
  const lapData = JSON.parse(localStorage.getItem('laporan_totals_snapshot') || 
                 localStorage.getItem(lapDataKey) || 'null');
    
    // Hapus data kas yang tidak akurat (3.200.000) dan gunakan data dari laporan (-40.000)
    // Hapus data dari summary_kpis jika tidak akurat
    localStorage.removeItem('summary_kpis');
    localStorage.removeItem(getDeviceKey('summary_kpis'));
    
    let totalKas = 0, totalMasuk = 0, totalKeluar = 0, iuranPending = 0;
    let dataSource = 'none';
    let isFirstTimeUser = false;
    
    // Priority 1: Use laporan data if available (static truth)
  if (lapData && lapData.totals) {
    totalMasuk = Number(lapData.totals.income || 0);
    totalKeluar = Number(lapData.totals.expense || 0);
    totalKas = Number(lapData.totals.balance || 0);
    dataSource = 'laporan';
    console.log('[Dashboard Preload] Using laporan snapshot data:', { totalMasuk, totalKeluar, totalKas });
  } 
  // Priority 2: fallback ke user-specific jika tidak ada lapData
  else if (userData) {
    totalKas = Number(userData.totalKas || 0);
    totalMasuk = Number(userData.totalMasuk || 0);
    totalKeluar = Number(userData.totalKeluar || 0);
    iuranPending = Number(userData.iuranPending || 0);
    dataSource = 'user_data';
    console.log('[Dashboard Preload] Using user-specific data (fallback):', { totalKas, totalMasuk, totalKeluar, iuranPending });
  }
  else {
    console.log('[Dashboard Preload] No laporan/user data, leaving zeros');
    dataSource = 'none';
    isFirstTimeUser = false;
  }
  // HILANGKAN kalkulasi transaksi di preload agar cepat dan konsisten
  // HILANGKAN perhitungan iuran pending di preload agar cepat dan konsisten
  // Update UI function
  function updateDashboardUI() {
    const elKas = document.getElementById('dash-total-kas');
    const elMasuk = document.getElementById('dash-total-masuk');
    const elKeluar = document.getElementById('dash-total-keluar');
    const elIuranPending = document.getElementById('dash-iuran-pending');

    let updated = false;

    if (firstVisit) {
      // Allow counters by setting data-target; also set final text for fallback
      if (elKas) { elKas.setAttribute('data-target', String(totalKas)); elKas.dataset.value = String(totalKas); elKas.textContent = fmtIDR(totalKas); updated = true; }
      if (elMasuk) { elMasuk.setAttribute('data-target', String(totalMasuk)); elMasuk.dataset.value = String(totalMasuk); elMasuk.textContent = fmtIDR(totalMasuk); updated = true; }
      if (elKeluar) { elKeluar.setAttribute('data-target', String(totalKeluar)); elKeluar.dataset.value = String(totalKeluar); elKeluar.textContent = fmtIDR(totalKeluar); updated = true; }
      if (elIuranPending) { elIuranPending.setAttribute('data-target', String(iuranPending)); elIuranPending.dataset.value = String(iuranPending); elIuranPending.textContent = fmtIDR(iuranPending); updated = true; }
    } else {
      // Not first visit: static display
      if (elKas) { elKas.textContent = fmtIDR(totalKas); elKas.removeAttribute('data-target'); elKas.dataset.value = String(totalKas); updated = true; }
      if (elMasuk) { elMasuk.textContent = fmtIDR(totalMasuk); elMasuk.removeAttribute('data-target'); elMasuk.dataset.value = String(totalMasuk); updated = true; }
      if (elKeluar) { elKeluar.textContent = fmtIDR(totalKeluar); elKeluar.removeAttribute('data-target'); elKeluar.dataset.value = String(totalKeluar); updated = true; }
      if (elIuranPending) { elIuranPending.textContent = fmtIDR(iuranPending); elIuranPending.removeAttribute('data-target'); elIuranPending.dataset.value = String(iuranPending); updated = true; }
    }

    if (updated) {
      console.log('[Dashboard Preload] UI updated successfully:', {
        totalKas: fmtIDR(totalKas),
        totalMasuk: fmtIDR(totalMasuk),
        totalKeluar: fmtIDR(totalKeluar),
        iuranPending: fmtIDR(iuranPending)
      });
      // Trigger counters only on first visit
      if (firstVisit && typeof window.initCounters === 'function') {
        setTimeout(() => { try { window.initCounters(); } catch (_) {} }, 60);
      }
    } else {
      console.warn('[Dashboard Preload] No dashboard elements found to update');
    }
  }

  // Update UI when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDashboardUI);
  } else {
    updateDashboardUI();
  }

  } catch (error) {
  }
}

function setupAutoRefresh() {
  // Refresh when page becomes visible (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[Dashboard Preload] Page visible, refreshing data...');
      loadDashboardDataImmediately();
    }
  });
  
  // Listen for localStorage changes from other tabs
  window.addEventListener('storage', (e) => {
    const refreshKeys = [
      'laporan_totals_snapshot',
      'financial_transactions_v2',
      'dues_configs',
      'dues_payments',
      'warga_data_v1'
    ];
    
    if (refreshKeys.includes(e.key)) {
      console.log('[Dashboard Preload] Data changed in another tab, refreshing...');
      setTimeout(loadDashboardDataImmediately, 100);
    }
  });
  
  // Periodic refresh every 30 seconds to ensure data stays fresh
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      console.log('[Dashboard Preload] Periodic refresh...');
      loadDashboardDataImmediately();
    }
  }, 30000);
}

// Initialize immediately
loadDashboardDataImmediately();
setupAutoRefresh();

// Export for manual refresh if needed
window.refreshDashboardData = loadDashboardDataImmediately;
window.clearDashboardData = function(){
  try {
    const deviceId = localStorage.getItem('device_id');
    const keys = [
      'summary_kpis',
      'laporan_totals_snapshot',
      'financial_transactions_v2',
      'dues_configs',
      'dues_payments',
      'warga_data_v1'
    ];
    if (deviceId) {
      keys.push(`user_dashboard_data_${deviceId}`);
      keys.push(`laporan_totals_snapshot_${deviceId}`);
    }
    keys.forEach(k => localStorage.removeItem(k));
    console.log('[Dashboard Preload] Cleared dashboard-related data');
  } catch(_) {}
};
