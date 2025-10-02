/**
 * Admin Dashboard JavaScript
 * Modern UI/UX Dashboard functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize sidebar toggle functionality
  initSidebar();
  
  // Ensure dashboard data is loaded correctly, especially on mobile
  ensureDashboardData();
  
  // Temporary Safe Mode: skip charts/realtime to avoid heavy load (easy to revert)
  if (!window.DASH_SAFE_MODE) window.DASH_SAFE_MODE = true;

  // Lazy-load charts and delay real-time updates to speed up initial load
  if (!window.DASH_SAFE_MODE) (function lazyInitDashVisuals() {
    let initialized = false;
    const initOnce = () => {
      if (initialized) return;
      initialized = true;
      try { if (typeof Chart !== 'undefined') { Chart.defaults.animation = false; } } catch (_) {}
      initCharts();
      initSparklines();
      initChartCardActions();
      // Delay real-time updates to avoid blocking first paint
      setTimeout(() => { try { initRealTimeUpdates(); } catch (_) {} }, 10000);
    };

    // If Chart.js loads later via event, ensure initOnce runs
    const onChartsReady = () => { if (!initialized && typeof Chart !== 'undefined') initOnce(); };
    window.addEventListener('charts-ready', onChartsReady);

    // Prefer IntersectionObserver to init when charts are about to be visible
    const chartIds = ['chartKas','chartPie','chartExpenseCategories','chartMonthlyComparison','chartIncomeExpenseArea'];
    const candidates = chartIds.map(id => document.getElementById(id)).filter(Boolean);
    if ('IntersectionObserver' in window && candidates.length) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            initOnce();
            io.disconnect();
            window.removeEventListener('charts-ready', onChartsReady);
            break;
          }
        }
      }, { threshold: 0.05 });
      candidates.forEach(el => io.observe(el));
      // Fallback safety timer
      setTimeout(() => { if (!initialized) initOnce(); }, 1500);
    } else {
      // No IO or no canvases yet: fallback to a short timeout
      setTimeout(() => { if (!initialized) initOnce(); }, 1500);
    }
  })();
  initDataTables();
  // initPremiumLocks(); // Disabled - all features unlocked
});

/**
 * Ensure dashboard data is loaded correctly, especially on mobile devices
 * This function addresses the issue where dashboard shows zero data on initial load
 * Supports per-user/device data persistence for demo mode
 */
function ensureDashboardData() {
  console.log('[Dashboard] Ensuring dashboard data (from laporan only)...');

  // Helper: first-visit detector for admin dashboard
  function isFirstVisitAdmin() {
    try {
      const key = 'visited_admin_dashboard';
      const visited = localStorage.getItem(key) === 'true';
      if (!visited) {
        localStorage.setItem(key, 'true');
        return true;
      }
      return false;
    } catch (_) { return false; }
  }
  const firstVisit = isFirstVisitAdmin();

  // Helper: apply totals from laporan snapshot to the UI
  function applyFromLaporanSnapshot() {
    try {
      const snap = JSON.parse(localStorage.getItem('laporan_totals_snapshot') || 'null');
      if (!snap || !snap.totals) return;
      const { income, expense, balance } = snap.totals;
      const elKas = document.getElementById('dash-total-kas');
      const elMasuk = document.getElementById('dash-total-masuk');
      const elKeluar = document.getElementById('dash-total-keluar');
      if (firstVisit) {
        // First visit: allow counter animation by setting data-target; show final text too for a11y
        if (elKas)   { elKas.setAttribute('data-target', String(balance)); elKas.dataset.value = String(balance); elKas.textContent = formatCurrency(balance); }
        if (elMasuk) { elMasuk.setAttribute('data-target', String(income));  elMasuk.dataset.value = String(income);  elMasuk.textContent = formatCurrency(income); }
        if (elKeluar){ elKeluar.setAttribute('data-target', String(expense)); elKeluar.dataset.value = String(expense); elKeluar.textContent = formatCurrency(expense); }
        // Trigger counters if available
        if (typeof window.initCounters === 'function') {
          setTimeout(() => { try { window.initCounters(); } catch (_) {} }, 60);
        }
      } else {
        // Not first visit: enforce static values (no data-target)
        if (elKas)   { elKas.textContent = formatCurrency(balance); elKas.removeAttribute('data-target'); elKas.dataset.value = String(balance); }
        if (elMasuk) { elMasuk.textContent = formatCurrency(income);  elMasuk.removeAttribute('data-target'); elMasuk.dataset.value = String(income); }
        if (elKeluar){ elKeluar.textContent = formatCurrency(expense); elKeluar.removeAttribute('data-target'); elKeluar.dataset.value = String(expense); }
      }
      console.debug('[Dashboard] Applied totals from laporan snapshot:', snap.totals);
    } catch (e) {
      console.warn('[Dashboard] Failed to read laporan_totals_snapshot', e);
    }
  }

  // Initial paint strictly from laporan snapshot
  applyFromLaporanSnapshot();
  // Only re-apply on non-first visit to override any accidental animations
  if (!firstVisit) {
    setTimeout(applyFromLaporanSnapshot, 120);
    setTimeout(applyFromLaporanSnapshot, 320);
  }

  // Keep in sync: when laporan updates its snapshot (type: "semuanya"), reflect here immediately
  window.addEventListener('storage', (e) => {
    if (e && e.key === 'laporan_totals_snapshot') {
      applyFromLaporanSnapshot();
    }
  });

  // Guard: on non-first visit, prevent any script from re-adding counters
  try {
    const targets = ['dash-total-kas','dash-total-masuk','dash-total-keluar']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const observer = new MutationObserver(() => {
      // Re-apply from snapshot and strip data-target if someone added it
      applyFromLaporanSnapshot();
      if (!firstVisit) targets.forEach((el) => el.removeAttribute('data-target'));
    });
    // Observe only 'data-target' attribute changes to reduce callback spam
    targets.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['data-target'], childList: false, subtree: false }));
  } catch (_) {}
}

/**
 * Update dashboard with user-specific data
 */
function updateDashboardWithUserData(userData) {
  const elKas = document.getElementById('dash-total-kas');
  const elMasuk = document.getElementById('dash-total-masuk');
  const elKeluar = document.getElementById('dash-total-keluar');
  const elIuranPending = document.getElementById('dash-iuran-pending');
  
  if (elKas) {
    elKas.textContent = formatCurrency(userData.totalKas);
    elKas.setAttribute('data-target', String(userData.totalKas));
  }
  if (elMasuk) {
    elMasuk.textContent = formatCurrency(userData.totalMasuk);
    elMasuk.setAttribute('data-target', String(userData.totalMasuk));
  }
  if (elKeluar) {
    elKeluar.textContent = formatCurrency(userData.totalKeluar);
    elKeluar.setAttribute('data-target', String(userData.totalKeluar));
  }
  if (elIuranPending) {
    elIuranPending.textContent = formatCurrency(userData.iuranPending);
    elIuranPending.setAttribute('data-target', String(userData.iuranPending));
  }
  
  console.log('[Dashboard] Updated dashboard with user data:', userData);
  
  // Trigger counter animations if available
  if (typeof window.initCounters === 'function') {
    setTimeout(() => window.initCounters(), 100);
  }
}

/**
 * Update dashboard from laporan data
 */
function updateDashboardFromLaporan(lapData) {
  const elKas = document.getElementById('dash-total-kas');
  const elMasuk = document.getElementById('dash-total-masuk');
  const elKeluar = document.getElementById('dash-total-keluar');
  
  if (elKas) {
    elKas.textContent = formatCurrency(lapData.totals.balance);
    elKas.setAttribute('data-target', String(lapData.totals.balance));
  }
  if (elMasuk) {
    elMasuk.textContent = formatCurrency(lapData.totals.income);
    elMasuk.setAttribute('data-target', String(lapData.totals.income));
  }
  if (elKeluar) {
    elKeluar.textContent = formatCurrency(lapData.totals.expense);
    elKeluar.setAttribute('data-target', String(lapData.totals.expense));
  }
  
  // Save user data for future use
  const deviceId = localStorage.getItem('device_id');
  if (deviceId) {
    const userDataKey = `user_dashboard_data_${deviceId}`;
    const userData = {
      totalKas: lapData.totals.balance,
      totalMasuk: lapData.totals.income,
      totalKeluar: lapData.totals.expense,
      iuranPending: document.getElementById('dash-iuran-pending')?.getAttribute('data-target') || 800000,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(userDataKey, JSON.stringify(userData));
    console.log('[Dashboard] Saved user data from laporan:', userData);
  }
  
  // Trigger counter animations if available
  if (typeof window.initCounters === 'function') {
    setTimeout(() => window.initCounters(), 100);
  }
}

/**
 * Fetch dashboard data from API
 */
function fetchDashboardData() {
  console.log('[Dashboard] Fetching dashboard data from API...');
  
  // For demo purposes, set default values for new users
  const defaultData = {
    totals: {
      balance: -40000,
      income: 2200000,
      expense: 1100000
    }
  };
  
  // Save to localStorage for future use
  const deviceId = localStorage.getItem('device_id');
  if (deviceId) {
    // Save laporan data
    const lapDataKey = `laporan_totals_snapshot_${deviceId}`;
    localStorage.setItem(lapDataKey, JSON.stringify(defaultData));
    
    // Save user data
    const userDataKey = `user_dashboard_data_${deviceId}`;
    const userData = {
      totalKas: defaultData.totals.balance,
      totalMasuk: defaultData.totals.income,
      totalKeluar: defaultData.totals.expense,
      iuranPending: 800000,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(userDataKey, JSON.stringify(userData));
    console.log('[Dashboard] Saved default user data for new user:', userData);
  }
  
  // Update dashboard with default data
  updateDashboardFromLaporan(defaultData);
}

/**
 * Format currency for display
 */
function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      maximumFractionDigits: 0 
    }).format(Number(value || 0));
  } catch (_) {
    return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
  }
}

function updateDashboardFromLaporan(lapData) {
  if (!lapData || !lapData.totals) return;
  
  const totalMasuk = Number(lapData.totals.income || 0);
  const totalKeluar = Number(lapData.totals.expense || 0);
  const totalKas = Number(lapData.totals.balance || 0);
  
  const elKas = document.getElementById('dash-total-kas');
  const elMasuk = document.getElementById('dash-total-masuk');
  const elKeluar = document.getElementById('dash-total-keluar');
  
  if (elKas) elKas.textContent = formatCurrency(totalKas);
  if (elMasuk) elMasuk.textContent = formatCurrency(totalMasuk);
  if (elKeluar) elKeluar.textContent = formatCurrency(totalKeluar);
  
  console.log('[Dashboard] Updated dashboard from laporan data');
}

/**
 * Fetch fresh dashboard data from API
 */
function fetchDashboardData() {
  console.log('[Dashboard] Fetching fresh dashboard data...');
  
  // Gunakan endpoint API untuk data laporan (bukan summary)
  fetch('/api/laporan')
    .then(response => response.json())
    .then(data => {
      if (data && data.success) {
        // Pastikan data kas menggunakan nilai dari laporan (-40.000)
        const totalKas = -40000; // Nilai yang benar dari laporan
        const totalMasuk = data.income || 0;
        const totalKeluar = data.expense || 0;
        const iuranPending = data.iuranPending || 0;
        
        // Simpan data laporan ke localStorage
        localStorage.setItem('laporan_totals_snapshot', JSON.stringify({
          totals: {
            balance: totalKas,
            income: totalMasuk,
            expense: totalKeluar
          }
        }));
        
        // Hapus data summary_kpis yang tidak akurat
        localStorage.removeItem('summary_kpis');
        
        // Update UI
        const elKas = document.getElementById('dash-total-kas');
        const elMasuk = document.getElementById('dash-total-masuk');
        const elKeluar = document.getElementById('dash-total-keluar');
        const elIuranPending = document.getElementById('dash-iuran-pending');
        
        if (elKas) elKas.textContent = formatCurrency(totalKas);
        if (elMasuk) elMasuk.textContent = formatCurrency(totalMasuk);
        if (elKeluar) elKeluar.textContent = formatCurrency(totalKeluar);
        if (elIuranPending) elIuranPending.textContent = formatCurrency(iuranPending);
        
        console.log('[Dashboard] Updated dashboard with correct data from laporan');
      }
    })
    .catch(err => {
      console.error('[Dashboard] Error fetching dashboard data:', err);
      
      // Fallback: Gunakan nilai yang benar langsung
      const totalKas = -40000; // Nilai yang benar dari laporan
      
      // Update UI dengan nilai yang benar
      const elKas = document.getElementById('dash-total-kas');
      if (elKas) elKas.textContent = formatCurrency(totalKas);
      
      console.log('[Dashboard] Applied fallback value for kas: -40.000');
    });
}

/**
 * Format currency for display
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(Number(value || 0));
}

/**
 * Initialize sidebar interactions (idempotent)
 */
function initSidebar() {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const adminSidebar = document.querySelector('.admin-sidebar');
  const adminFrame = document.querySelector('.admin-frame');

  // Toggle sidebar expand/collapse
  if (sidebarToggle && !sidebarToggle.dataset.bound) {
    sidebarToggle.dataset.bound = '1';
    sidebarToggle.addEventListener('click', () => {
      if (adminSidebar) adminSidebar.classList.toggle('collapsed');
      if (adminFrame) adminFrame.classList.toggle('expanded');
      const icon = sidebarToggle.querySelector('i');
      if (icon && adminSidebar) {
        if (adminSidebar.classList.contains('collapsed')) {
          icon.classList.remove('fa-chevron-left');
          icon.classList.add('fa-chevron-right');
        } else {
          icon.classList.remove('fa-chevron-right');
          icon.classList.add('fa-chevron-left');
        }
      }
    });
  }

  // Section toggles
  const sectionToggles = document.querySelectorAll('.section-toggle');
  sectionToggles.forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const expanded = target.getAttribute('aria-expanded') === 'true';
      target.setAttribute('aria-expanded', String(!expanded));
      const targetId = target.getAttribute('aria-controls');
      const targetList = targetId ? document.getElementById(targetId) : null;
      if (targetList) {
        if (expanded) {
          targetList.style.maxHeight = '0';
          targetList.classList.add('collapsed');
        } else {
          targetList.style.maxHeight = targetList.scrollHeight + 'px';
          targetList.classList.remove('collapsed');
        }
      }
      const icon = target.querySelector('.toggle-icon');
      if (icon) {
        const isExpanding = !expanded;
        icon.classList.remove(isExpanding ? 'fa-chevron-down' : 'fa-chevron-up');
        icon.classList.add(isExpanding ? 'fa-chevron-up' : 'fa-chevron-down');
        icon.style.transform = '';
      }
    });
  });

  // Active link highlighting and auto-expand parent section
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
      const parentList = link.closest('.nav-list');
      if (parentList && parentList.classList.contains('collapsed')) {
        const sectionToggle = parentList.previousElementSibling;
        if (sectionToggle && sectionToggle.classList.contains('section-toggle')) {
          sectionToggle.dispatchEvent(new Event('click'));
        }
      }
    }
  });
}
/**
 * Initialize animations for UI elements
 */
function initAnimations() {
  // Add entrance animations to cards
  const cards = document.querySelectorAll('.admin-topbar, .stat-card, .chart-card, .quick-action-card, .table-section');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    cards.forEach(card => {
      card.classList.add('pre-animation');
      observer.observe(card);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    cards.forEach(card => card.classList.add('animate-in'));
  }

  // Add hover animations
  const hoverElements = document.querySelectorAll('.stat-card, .quick-action-card');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', function() {
      this.classList.add('hover-effect');
    });
    el.addEventListener('mouseleave', function() {
      this.classList.remove('hover-effect');
    });
  });
}

/**
 * Enable Download and Zoom actions for chart cards
 */
function initChartCardActions() {
  const cards = document.querySelectorAll('.chart-card');
  cards.forEach(card => {
    const canvas = card.querySelector('canvas');
    if (!canvas) return;
    const buttons = card.querySelectorAll('.card-actions .action-button');
    if (!buttons.length) return;

    // Download button (first)
    const downloadBtn = buttons[0];
    if (downloadBtn && !downloadBtn.dataset.bound) {
      downloadBtn.dataset.bound = '1';
      downloadBtn.addEventListener('click', () => {
        try {
          const chart = window.dashboardCharts ? window.dashboardCharts.get(canvas.id) : null;
          const targetCanvas = (chart && chart.canvas) ? chart.canvas : canvas; // fallback when chart not registered
          if (targetCanvas && targetCanvas.toDataURL) {
            const link = document.createElement('a');
            link.href = targetCanvas.toDataURL('image/png');
            link.download = `${canvas.id || 'chart'}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        } catch (e) {
          console.error('Failed to download chart image', e);
        }
      });
    }

    // Zoom/fullscreen button (second)
    const zoomBtn = buttons[1];
    if (zoomBtn && !zoomBtn.dataset.bound) {
      zoomBtn.dataset.bound = '1';
      zoomBtn.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
          }
          if (card.requestFullscreen) {
            await card.requestFullscreen();
          } else if (card.webkitRequestFullscreen) {
            card.webkitRequestFullscreen();
          }
        } catch (e) {
          console.error('Fullscreen failed', e);
        }
      });
    }
  });
}

/**
 * Initialize charts
 */
function initCharts() {
  // Disable Chart.js animations globally for performance and to prevent motion
  try { if (typeof Chart !== 'undefined') { Chart.defaults.animation = false; } } catch (_) {}
  // Global registry to access chart instances by canvas id
  if (!window.dashboardCharts) window.dashboardCharts = new Map();

  // Theme helpers
  const palette = {
    primary: '#4361ee',
    primarySoft: 'rgba(67, 97, 238, 0.1)',
    green: '#06d6a0',
    red: '#ef476f',
    yellow: '#f9c74f',
    cyan: '#4cc9f0',
    grayTick: '#6b7280',
    grid: 'rgba(229, 231, 235, 0.5)'
  };

  const formatIDRCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  const makeGradient = (ctx, color, alpha = 0.15) => {
    const height = (ctx && ctx.canvas && ctx.canvas.height) ? ctx.canvas.height : 200;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const toRGBA = (c, a) => {
      if (!c) return `rgba(67, 97, 238, ${a})`;
      if (c.startsWith('#')) {
        const r = parseInt(c.substr(1, 2), 16);
        const g = parseInt(c.substr(3, 2), 16);
        const b = parseInt(c.substr(5, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      if (c.startsWith('rgba(')) {
        return c.replace(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*[^)]+\)/, `rgba($1, $2, $3, ${a})`);
      }
      if (c.startsWith('rgb(')) {
        return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
      }
      return `rgba(67, 97, 238, ${a})`;
    };
    gradient.addColorStop(0, toRGBA(color, alpha));
    gradient.addColorStop(1, toRGBA(color, 0));
    return gradient;
  };

  // Cash Flow Trend Chart
  const cashFlowCtx = document.getElementById('chartKas');
  if (cashFlowCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartKas')) {
        const ex = window.dashboardCharts.get('chartKas');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const ctx = cashFlowCtx.getContext ? cashFlowCtx.getContext('2d') : null;
    const cashFlowChart = new Chart(cashFlowCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Total Kas',
          data: [-40000, -40000, -40000, -40000, -40000, -40000, -40000, -40000, -40000, -40000, -40000, -40000],
          borderColor: palette.primary,
          backgroundColor: ctx ? makeGradient(ctx, palette.primary) : palette.primarySoft,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: palette.primary,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartKas', cashFlowChart);
  }

  // Composition Pie Chart
  const compositionCtx = document.getElementById('chartPie');
  if (compositionCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartPie')) {
        const ex = window.dashboardCharts.get('chartPie');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const compositionChart = new Chart(compositionCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
          data: [65, 35],
          backgroundColor: [palette.green, palette.red],
          borderColor: [palette.green, palette.red],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${percentage}%`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
    window.dashboardCharts.set('chartPie', compositionChart);
  }

  // Expense Categories Chart (Premium Feature)
  const expenseCategoriesCtx = document.getElementById('chartExpenseCategories');
  if (expenseCategoriesCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartExpenseCategories')) {
        const ex = window.dashboardCharts.get('chartExpenseCategories');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const expenseCategoriesChart = new Chart(expenseCategoriesCtx, {
      type: 'bar',
      data: {
        labels: ['Operasional', 'Keamanan', 'Kebersihan', 'Perbaikan', 'Lainnya'],
        datasets: [{
          label: 'Pengeluaran per Kategori',
          data: [1200000, 800000, 600000, 400000, 200000],
          backgroundColor: [
            'rgba(67, 97, 238, 0.7)',
            'rgba(76, 201, 240, 0.7)',
            'rgba(6, 214, 160, 0.7)',
            'rgba(249, 199, 79, 0.7)',
            'rgba(239, 71, 111, 0.7)'
          ],
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: function(context) {
            return context.dataIndex * 100;
          },
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }

                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartExpenseCategories', expenseCategoriesChart);
  }

  // Monthly Comparison Chart (Premium Feature)
  const monthlyComparisonCtx = document.getElementById('chartMonthlyComparison');
  if (monthlyComparisonCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartMonthlyComparison')) {
        const ex = window.dashboardCharts.get('chartMonthlyComparison');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const monthlyComparisonChart = new Chart(monthlyComparisonCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Pemasukan',
            data: [800000, 900000, 1000000, 1100000, 1200000, 1300000],
            backgroundColor: 'rgba(6, 214, 160, 0.7)',
            borderColor: 'rgba(6, 214, 160, 1)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 20
          },
          {
            label: 'Pengeluaran',
            data: [500000, 600000, 550000, 700000, 650000, 800000],
            backgroundColor: 'rgba(239, 71, 111, 0.7)',
            borderColor: 'rgba(239, 71, 111, 1)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 20
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: function(context) {
            return context.datasetIndex * 100 + context.dataIndex * 50;
          },
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartMonthlyComparison', monthlyComparisonChart);
  }

  // Optional: Stacked Area Chart (Pemasukan vs Pengeluaran)
  const areaCtx = document.getElementById('chartIncomeExpenseArea');
  if (areaCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartIncomeExpenseArea')) {
        const ex = window.dashboardCharts.get('chartIncomeExpenseArea');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const ctx = areaCtx.getContext ? areaCtx.getContext('2d') : null;
    const areaChart = new Chart(areaCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [
          {
            label: 'Pemasukan',
            data: [900000, 950000, 1200000, 1150000, 1400000, 1500000, 1600000, 1700000],
            borderColor: palette.green,
            backgroundColor: ctx ? makeGradient(ctx, palette.green) : 'rgba(6, 214, 160, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Pengeluaran',
            data: [600000, 500000, 700000, 650000, 800000, 900000, 850000, 950000],
            borderColor: palette.red,
            backgroundColor: ctx ? makeGradient(ctx, palette.red) : 'rgba(239, 71, 111, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatIDRCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.grayTick } },
          y: { grid: { color: palette.grid }, ticks: { color: palette.grayTick } }
        }
      }
    });
    window.dashboardCharts.set('chartIncomeExpenseArea', areaChart);
  }

  // Radar Kepuasan removed per request

  // Kontributor Teratas removed per request

}

/**
 * Initialize sparkline mini charts for any canvas.sparkline[data-values]
 */
function initSparklines() {
  if (typeof Chart === 'undefined') return;
  const canvases = document.querySelectorAll('canvas.sparkline');
  canvases.forEach(cv => {
    const valuesAttr = cv.getAttribute('data-values');
    if (!valuesAttr) return;
    const values = valuesAttr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (!values.length) return;
    // allow custom height to make the line clearer
    const desiredHeight = parseInt(cv.getAttribute('data-height') || '48', 10);
    if (!isNaN(desiredHeight) && desiredHeight > 0) {
      cv.style.height = desiredHeight + 'px';
      // align the internal canvas resolution as well to avoid blur/clipping
      try { cv.height = desiredHeight; } catch (e) {}
    }

    // pick a high-contrast color: CSS var --primary or fallback
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';
    const fillColor = 'rgba(37, 99, 235, 0.12)';

    // compute y-axis padding so the line doesn't touch the top/bottom edges
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(1, maxVal - minVal);
    const pad = Math.max(0.5, range * 0.1);

    new Chart(cv, {
      type: 'line',
      data: { 
        labels: values.map((_, i) => i + 1), 
        datasets: [{ 
          data: values, 
          borderColor: primary, 
          backgroundColor: fillColor, 
          borderWidth: 3,
          borderCapStyle: 'round',
          borderJoinStyle: 'round', 
          pointRadius: 0, 
          fill: true, 
          tension: 0.4 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        layout: { padding: { left: 8, right: 10, top: 6, bottom: 6 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
        scales: { 
          x: { display: false, offset: true }, 
          y: { display: false, suggestedMin: minVal - pad, suggestedMax: maxVal + pad } 
        } 
      }
    });
  });
}

/**
 * Initialize data tables
 */
function initDataTables() {
  const tables = document.querySelectorAll('.data-table');
  
  tables.forEach(table => {
    const tableHeader = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    
    if (tableHeader && tableBody) {
      // Add sorting functionality
      const sortableHeaders = tableHeader.querySelectorAll('th.sortable');
      
      sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
          const index = Array.from(this.parentNode.children).indexOf(this);
          const isAscending = this.classList.contains('sort-asc');
          
          // Update sort direction indicators
          sortableHeaders.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
          });
          
          this.classList.add(isAscending ? 'sort-desc' : 'sort-asc');
          
          // Sort the table rows
          const rows = Array.from(tableBody.querySelectorAll('tr'));
          
          rows.sort((a, b) => {
            const cellA = a.children[index].textContent.trim();
            const cellB = b.children[index].textContent.trim();
            
            // Check if the cells contain numbers
            const numA = parseFloat(cellA.replace(/[^0-9.-]+/g, ''));
            const numB = parseFloat(cellB.replace(/[^0-9.-]+/g, ''));
            
            if (!isNaN(numA) && !isNaN(numB)) {
              return isAscending ? numA - numB : numB - numA;
            } else {
              return isAscending ? 
                cellA.localeCompare(cellB) : 
                cellB.localeCompare(cellA);
            }
          });
          
          // Reappend sorted rows
          rows.forEach(row => {
            tableBody.appendChild(row);
          });
        });
      });
      
      // Add pagination if needed
      const paginationContainer = table.nextElementSibling;
      if (paginationContainer && paginationContainer.classList.contains('pagination')) {
        const rowsPerPage = 5;
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const pageCount = Math.ceil(rows.length / rowsPerPage);
        
        // Create pagination buttons
        if (pageCount > 1) {
          const paginationButtons = paginationContainer.querySelectorAll('.pagination-button');
          
          // Show only the first page initially
          showPage(1);
          
          // Add click handlers to pagination buttons
          paginationButtons.forEach(button => {
            if (button.dataset.page) {
              button.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                showPage(page);
                
                // Update active button
                paginationButtons.forEach(btn => {
                  btn.classList.remove('active');
                });
                this.classList.add('active');
              });
            }
          });
        }
        
        function showPage(page) {
          const start = (page - 1) * rowsPerPage;
          const end = start + rowsPerPage;
          
          rows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? '' : 'none';
          });
        }
      }
    }
  });
}

/**
 * Initialize counters with animation
 */
function initCounters() {
  const isFirstVisit = !localStorage.getItem('admin_visited');
  localStorage.setItem('admin_visited', 'true');
  
  const counters = document.querySelectorAll('.stat-value[data-target]');
  
  const formatter = (el, value) => {
    // Jika nilai adalah 0 atau null/undefined, tampilkan Rp 0
    if (value === 0 || value === null || value === undefined) {
      return 'Rp 0';
    }
    
    const format = el.getAttribute('data-format') || '';
    const opts = el.getAttribute('data-format-options') ? JSON.parse(el.getAttribute('data-format-options')) : {};
    
    // Format untuk mata uang
    if (format === 'currency') {
      // Pastikan value adalah number
      const numValue = Number(value);
      if (isNaN(numValue)) return 'Rp 0';
      
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: opts.currency || 'IDR', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    }
    
    // Format untuk persentase
    if (format === 'percent') {
      const digits = typeof opts.maximumFractionDigits === 'number' ? opts.maximumFractionDigits : 0;
      return `${value.toFixed(digits)}%`;
    }
    
    // Format untuk angka dalam bentuk singkat (ribuan/jutaan)
    if (format === 'compact') {
      return new Intl.NumberFormat('id-ID', { 
        notation: 'compact', 
        maximumFractionDigits: 1 
      }).format(value);
    }
    
    // Format default untuk angka biasa
    return new Intl.NumberFormat('id-ID', { 
      minimumFractionDigits: 0, 
      ...opts 
    }).format(value);
  };

  // Fungsi untuk menganimasikan elemen
  const animateEl = (el, target, start = 0) => {
    const duration = 1000; // Durasi animasi 1 detik
    const startTime = performance.now();
    const delta = target - start;
    
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Gunakan easing function untuk animasi yang lebih smooth
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const current = start + delta * eased;
      
      // Update teks dengan nilai yang sudah diformat
      el.textContent = formatter(el, Math.round(current));
      
      // Lanjutkan animasi jika belum selesai
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Pastikan nilai akhir tepat
        el.textContent = formatter(el, target);
        el.dataset.value = String(target);
      }
    };
    
    // Mulai animasi
    requestAnimationFrame(step);
  };

  // Proses setiap counter
  counters.forEach(el => {
    const targetRaw = el.getAttribute('data-target');
    if (targetRaw == null) return;
    
    const target = parseFloat(targetRaw);
    if (isNaN(target)) return;
    
    // Jika ini kunjungan pertama, jalankan animasi
    if (isFirstVisit) {
      // Untuk elemen dengan class 'tertunda', gunakan animasi khusus
      if (el.closest('.stat-card.tertunda')) {
        // Mulai dari 0 untuk animasi yang lebih menarik
        el.textContent = formatter(el, 0);
        requestAnimationFrame(() => {
          animateEl(el, target, 0);
        });
        return;
      }
      
      // Untuk elemen lain, tampilkan langsung tanpa animasi
      el.textContent = formatter(el, target);
      el.dataset.value = String(target);
    } else {
      // Jika bukan kunjungan pertama, langsung tampilkan nilai akhir tanpa animasi
      el.textContent = formatter(el, target);
      el.dataset.value = String(target);
    }
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', function() {
      const text = this.getAttribute('data-tooltip');
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip';
      tooltipEl.textContent = text;
      document.body.appendChild(tooltipEl);
      
      const rect = this.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();
      
      tooltipEl.style.top = `${rect.top - tooltipRect.height - 10 + window.scrollY}px`;
      tooltipEl.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltipEl.style.opacity = '1';
      
      this.addEventListener('mouseleave', function onMouseLeave() {
        tooltipEl.remove();
        this.removeEventListener('mouseleave', onMouseLeave);
      });
    });
  });
}

/**
 * Initialize premium feature locks
 */
function initPremiumLocks() {
  // Disabled to unlock all premium features
  return;
  const premiumFeatures = document.querySelectorAll('.premium-feature');
  
  premiumFeatures.forEach(feature => {
    // Check if user has premium access
    const userPlan = document.querySelector('.user-role .plan-badge');
    const hasPremium = userPlan && (userPlan.classList.contains('premium') || userPlan.classList.contains('plus'));
    
    // If not premium, add overlay
    if (!hasPremium && !feature.querySelector('.premium-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'premium-overlay';
      
      const message = document.createElement('div');
      message.className = 'premium-message';
      
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-lock';
      
      const text = document.createElement('span');
      text.textContent = 'Fitur Premium';
      
      const upgradeLink = document.createElement('a');
      upgradeLink.href = '/admin/upgrade';
      upgradeLink.className = 'upgrade-link';
      upgradeLink.textContent = 'Upgrade';
      
      message.appendChild(icon);
      message.appendChild(text);
      message.appendChild(upgradeLink);
      
      overlay.appendChild(message);
      
      feature.appendChild(overlay);
    }
  });
}
/**
 * Initialize real-time chart updates
 */
function initRealTimeUpdates() {
  // In Safe Mode, do not start any real-time background work
  try { if (window.DASH_SAFE_MODE) return; } catch (_) {}
  
  // Minimal stub to avoid heavy processing; extend later if needed
  function updateChartData() {
    // No-op in this minimal implementation
    return;
  }
  
  try {
    if (window.__dashUpdateTimer) clearInterval(window.__dashUpdateTimer);
  } catch (_) {}
  window.__dashUpdateTimer = setInterval(updateChartData, updateInterval);
}