// Financial Report Dashboard Script (extracted from laporan.astro)
// TypeScript version with minimal typings to eliminate implicit any diagnostics

// Global Chart type (loaded via script tag at runtime)
declare global {
  interface Window { Chart: any }
}

// Utility types
export type TxType = 'Masuk' | 'Keluar';

export interface Transaction {
  date: string;
  type: TxType;
  category: string;
  description?: string;
  amount: number;
}

interface ChartsState {
  balance: any | null;
  composition: any | null;
  trends: any | null;
}

interface Filters {
  start: string;
  end: string;
  search: string;
  minAmount: number;
  maxAmount: number;
  preset: string;
}

interface Adjustment {
  description: string;
  type: TxType;
  amount: number;
  category?: string;
}

interface ReportTotals { income: number; expense: number; balance: number }

interface Report {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  type?: string;
  source?: string;
  author?: string;
  reference?: string;
  tags?: string[];
  includeZero?: boolean;
  notes?: string;
  adjustments?: Adjustment[];
  totals: ReportTotals;
  createdAt: string;
}

// Application state
const appState: {
  transactions: Transaction[];
  filters: Filters;
  charts: ChartsState;
  reports: Report[];
  activeReportId: number | null;
} = {
  transactions: [],
  filters: {
    start: '',
    end: '',
    search: '',
    minAmount: 0,
    maxAmount: 0,
    preset: 'bulan-ini'
  },
  charts: {
    balance: null,
    composition: null,
    trends: null
  },
  reports: [],
  activeReportId: null
};

// Load Chart.js dynamically
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
document.head.appendChild(script);

// Utility functions
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Math.round(amount || 0));

const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num || 0));

const formatDateID = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const toISODate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Toast notification system
function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const container = document.getElementById('toast-wrap');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap: Record<string, string> = {
    info: 'fa-info',
    success: 'fa-check',
    warning: 'fa-exclamation',
    error: 'fa-times'
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${iconMap[type] || iconMap.info}"></i>
    </div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    (toast as HTMLDivElement).style.opacity = '0';
    (toast as HTMLDivElement).style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Category color mapping
const CATEGORY_COLORS: { name: string; color: string }[] = [
  { name: 'Iuran', color: '#0ea5e9' },
  { name: 'Keamanan', color: '#f97316' },
  { name: 'Donasi', color: '#84cc16' },
  { name: 'Lingkungan', color: '#22c55e' },
  { name: 'Kebersihan', color: '#10b981' },
  { name: 'Sosial', color: '#ef4444' },
  { name: 'Fasilitas', color: '#8b5cf6' },
  { name: 'Administrasi', color: '#64748b' }
];

const getCategoryColor = (category: string) => {
  const found = CATEGORY_COLORS.find(c => c.name === category);
  return found ? found.color : '#64748b';
};

// Data generation
function randomBetween(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomChoice<T>(array: T[]): T { return array[Math.floor(Math.random() * array.length)] }

function generateMonthData(year: number, month: number): Transaction[] {
  const monthStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const transactions: Transaction[] = [];

  const vendors = [
    'Warung Bu Sari', 'CV Cahaya Abadi', 'Tukang Kebun', 'Panitia RW', 'PT Prisma', 'UD Berkah Jaya'
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const date = `${year}-${monthStr}-${dayStr}`;

    if (day <= 7 && Math.random() > 0.25) {
      const unitAmount = randomBetween(200000, 350000);
      const householdCount = randomBetween(3, 15);
      transactions.push({ date, type: 'Masuk', category: 'Iuran', description: `Iuran Warga (${householdCount} KK)`, amount: unitAmount * householdCount });
    }

    if (Math.random() > 0.93) {
      transactions.push({ date, type: 'Masuk', category: 'Donasi', description: 'Donasi Sukarela', amount: randomBetween(100000, 900000) });
    }

    if (day % 7 === 3) {
      transactions.push({ date, type: 'Keluar', category: 'Keamanan', description: 'Upah Jaga Malam', amount: 250000 });
    }

    if (day % 7 === 5) {
      transactions.push({ date, type: 'Keluar', category: 'Kebersihan', description: 'Kebersihan & Sampah', amount: 180000 });
    }

    if (Math.random() > 0.94) {
      transactions.push({ date, type: 'Keluar', category: 'Lingkungan', description: 'Perawatan Taman', amount: randomBetween(150000, 450000) });
    }

    if (Math.random() > 0.95) {
      transactions.push({ date, type: 'Keluar', category: 'Administrasi', description: `ATK ${randomChoice(vendors)}`, amount: randomBetween(50000, 250000) });
    }

    if (Math.random() > 0.965) {
      transactions.push({ date, type: 'Keluar', category: 'Fasilitas', description: 'Pemeliharaan Fasilitas', amount: randomBetween(200000, 700000) });
    }

    if (Math.random() > 0.975) {
      transactions.push({ date, type: 'Keluar', category: 'Sosial', description: 'Bantuan Sosial', amount: randomBetween(150000, 600000) });
    }
  }

  return transactions;
}

// Initialize data
function initializeData() {
  const storageKey = 'financial_transactions_v2';
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) appState.transactions = (JSON.parse(stored) || []) as Transaction[];
  } catch { appState.transactions = [] }

  if (!Array.isArray(appState.transactions) || appState.transactions.length === 0) {
    const currentDate = new Date();
    const months = [-2, -1, 0, 1, 2, 3];
    let allTransactions: Transaction[] = [];
    months.forEach(offset => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
      const monthData = generateMonthData(date.getFullYear(), date.getMonth() + 1);
      allTransactions = allTransactions.concat(monthData);
    });
    appState.transactions = allTransactions.sort((a, b) => a.date.localeCompare(b.date));
    try { localStorage.setItem(storageKey, JSON.stringify(appState.transactions)) } catch {}
  }
}

// Filter preset functions
function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function applyFilterPreset(preset: string) {
  const transactions = appState.transactions;
  const minDate = transactions.length ? transactions[0].date : toISODate(new Date());
  const maxDate = transactions.length ? transactions[transactions.length - 1].date : toISODate(new Date());

  switch (preset) {
    case 'bulan-ini': {
      const period = getDefaultPeriod();
      appState.filters.start = period.start;
      appState.filters.end = period.end;
      break;
    }
    case 'bulan-lalu': {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      appState.filters.start = toISODate(start);
      appState.filters.end = toISODate(end);
      break;
    }
    case '30-hari': {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      appState.filters.start = toISODate(start);
      appState.filters.end = toISODate(end);
      break;
    }
    case 'ytd': {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      appState.filters.start = toISODate(start);
      appState.filters.end = toISODate(now);
      break;
    }
    case 'semua': {
      appState.filters.start = minDate;
      appState.filters.end = maxDate;
      break;
    }
  }
  appState.filters.preset = preset;
}

// Filter application
function getFilteredTransactions(): Transaction[] {
  const f = appState.filters;
  let filtered = appState.transactions.slice();
  if (f.start) filtered = filtered.filter(t => t.date >= f.start);
  if (f.end) filtered = filtered.filter(t => t.date <= f.end);
  if (f.search) {
    const search = f.search.toLowerCase().trim();
    filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(search) || t.category.toLowerCase().includes(search) || t.type.toLowerCase().includes(search));
  }
  if (f.minAmount && Number(f.minAmount) > 0) filtered = filtered.filter(t => t.amount >= Number(f.minAmount));
  if (f.maxAmount && Number(f.maxAmount) > 0) filtered = filtered.filter(t => t.amount <= Number(f.maxAmount));
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate totals
function calculateTotals(transactions: Transaction[]) {
  const income = transactions.filter(t => t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense, count: transactions.length } as ReportTotals & { count: number };
}

// Generate daily series for charts
function generateDailySeries(transactions: Transaction[]) {
  const dates = Array.from(new Set(transactions.map(t => t.date))).sort();
  const dailyIncome = dates.map(date => transactions.filter(t => t.date === date && t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0));
  const dailyExpense = dates.map(date => transactions.filter(t => t.date === date && t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0));
  const cumulativeBalance = dates.map((_, index) => {
    const totalIncome = dailyIncome.slice(0, index + 1).reduce((sum, amount) => sum + amount, 0);
    const totalExpense = dailyExpense.slice(0, index + 1).reduce((sum, amount) => sum + amount, 0);
    return totalIncome - totalExpense;
  });
  return { labels: dates.map(formatDateID), dates, dailyIncome, dailyExpense, cumulativeBalance };
}

// Animate numbers
function animateValue(element: HTMLElement | null, targetValue: number, formatter: (n: number) => string | number = (n) => n) {
  if (!element) return;
  const el = element as HTMLElement;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) { el.textContent = String(formatter(targetValue)); return }
  const startValue = Number((el).dataset.value || '0') || 0;
  const startTime = performance.now();
  const duration = 800;
  function updateValue(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
    el.textContent = String(formatter(currentValue));
    if (progress < 1) requestAnimationFrame(updateValue); else el.dataset.value = String(targetValue);
  }
  requestAnimationFrame(updateValue);
}

// Chart management
function destroyCharts() {
  (Object.keys(appState.charts) as (keyof ChartsState)[]).forEach(key => {
    const ch = appState.charts[key];
    if (ch) {
      try { (ch as any).destroy() } catch {}
      (appState.charts as any)[key] = null;
    }
  });
}

function removeSkeletons() {
  ['sk-balance', 'sk-mix', 'sk-inout'].forEach(id => {
    const skeleton = document.getElementById(id);
    skeleton?.remove();
  });
}

function showEmptyCharts() {
  removeSkeletons();
  const chartConfigs = [
    { id: 'lap-balance', text: 'Tidak ada data untuk periode ini' },
    { id: 'lap-mix', text: 'Tidak ada data komposisi' },
    { id: 'lap-inout', text: 'Tidak ada data transaksi' }
  ];
  chartConfigs.forEach(config => {
    const canvas = document.getElementById(config.id) as HTMLCanvasElement | null;
    if (canvas) {
      const container = canvas.closest('.chart-container');
      if (container && !container.querySelector('.empty-chart')) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-chart';
        emptyDiv.textContent = config.text;
        container.appendChild(emptyDiv);
      }
    }
  });
}

function createCharts(transactions: Transaction[]) {
  if (!window.Chart) return;
  removeSkeletons();
  destroyCharts();
  const series = generateDailySeries(transactions);
  const totals = calculateTotals(transactions);

  const balanceCtx = (document.getElementById('lap-balance') as HTMLCanvasElement | null)?.getContext('2d');
  if (balanceCtx) {
    appState.charts.balance = new (window as any).Chart(balanceCtx, {
      type: 'line',
      data: { labels: series.labels, datasets: [{ label: 'Saldo', data: series.cumulativeBalance, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#3b82f6', pointBorderColor: '#ffffff', pointBorderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: any) => formatIDR(context.parsed.y) } } },
        scales: { y: { ticks: { callback: (value: number) => formatNumber(value) }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }, x: { grid: { display: false } } }
      }
    });
  }

  const compositionCtx = (document.getElementById('lap-mix') as HTMLCanvasElement | null)?.getContext('2d');
  if (compositionCtx && (totals.income > 0 || totals.expense > 0)) {
    appState.charts.composition = new (window as any).Chart(compositionCtx, {
      type: 'doughnut',
      data: { labels: ['Pemasukan', 'Pengeluaran'], datasets: [{ data: [totals.income, totals.expense], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 16, usePointStyle: true, pointStyle: 'circle', padding: 20 } },
          tooltip: { callbacks: { label: (context: any) => `${context.label}: ${formatIDR(context.parsed)}` } }
        },
        cutout: '65%'
      }
    });
  }

  const trendsCtx = (document.getElementById('lap-inout') as HTMLCanvasElement | null)?.getContext('2d');
  if (trendsCtx) {
    appState.charts.trends = new (window as any).Chart(trendsCtx, {
      type: 'bar',
      data: { labels: series.labels, datasets: [
        { label: 'Pemasukan', data: series.dailyIncome, backgroundColor: '#22c55e', borderRadius: 8, borderSkipped: false },
        { label: 'Pengeluaran', data: series.dailyExpense, backgroundColor: '#ef4444', borderRadius: 8, borderSkipped: false }
      ] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 16, usePointStyle: true, pointStyle: 'rectRounded', padding: 20 } },
          tooltip: { callbacks: { label: (context: any) => `${context.dataset.label}: ${formatIDR(context.parsed.y)}` } }
        },
        scales: { y: { ticks: { callback: (value: number) => formatNumber(value) }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }, x: { grid: { display: false } } }
      }
    });
  }
}

// Anomaly detection
function detectAnomalies(transactions: Transaction[]) {
  const container = document.getElementById('anom-list');
  if (!container) return;
  container.innerHTML = '';

  const series = generateDailySeries(transactions);
  if (series.dates.length === 0) { container.innerHTML = '<li class="loading-state">Tidak ada data untuk dianalisis</li>'; return }

  const avgIncome = series.dailyIncome.reduce((sum, val) => sum + val, 0) / Math.max(1, series.dailyIncome.length);
  const avgExpense = series.dailyExpense.reduce((sum, val) => sum + val, 0) / Math.max(1, series.dailyExpense.length);

  type Anomaly = { date: string; type: 'critical' | 'warning'; message: string };
  const anomalies: Anomaly[] = [];

  for (let i = 0; i < series.dates.length; i++) {
    const dayIncome = series.dailyIncome[i];
    const dayExpense = series.dailyExpense[i];
    if (dayExpense > (avgExpense * 2.5) && dayExpense > 0) {
      anomalies.push({ date: series.dates[i], type: 'critical', message: `Pengeluaran ${formatIDR(dayExpense)} sangat tinggi, melebihi 2.5× rata-rata harian (${formatIDR(avgExpense)})` });
    } else if (dayExpense > (dayIncome * 3) && dayExpense > 0 && dayIncome > 0) {
      anomalies.push({ date: series.dates[i], type: 'warning', message: `Pengeluaran ${formatIDR(dayExpense)} jauh melebihi pemasukan hari yang sama (${formatIDR(dayIncome)})` });
    }
  }

  if (anomalies.length === 0) { container.innerHTML = '<li class="loading-state">Tidak ada anomali terdeteksi pada periode ini</li>'; return }

  anomalies.forEach(anomaly => {
    const item = document.createElement('li');
    item.className = 'anomaly-item';
    item.innerHTML = `
      <div class="anomaly-content">
        <div class="anomaly-date">${formatDateID(anomaly.date)}</div>
        <div class="anomaly-description">${anomaly.message}</div>
      </div>
      <span class="anomaly-badge ${anomaly.type}">
        <i class="fas ${anomaly.type === 'critical' ? 'fa-exclamation-triangle' : 'fa-exclamation'}"></i>
        ${anomaly.type === 'critical' ? 'Kritis' : 'Peringatan'}
      </span>
    `;
    container.appendChild(item);
  });
}

// Generate insights
function generateInsights(transactions: Transaction[]) {
  const container = document.getElementById('insight-list');
  if (!container) return;
  container.innerHTML = '';
  if (transactions.length === 0) { container.innerHTML = '<div class="loading-state">Tidak ada data untuk menghasilkan insight</div>'; return }

  const totals = calculateTotals(transactions);
  const expensesByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === 'Keluar').forEach(t => { expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount });
  const topCategory = Object.entries(expensesByCategory).sort(([,a], [,b]) => b - a)[0];

  const insights: { icon: string; text: string }[] = [];
  if (topCategory) {
    const [category, amount] = topCategory as [string, number];
    const percentage = Math.round((amount / Math.max(1, totals.expense)) * 100);
    insights.push({ icon: 'fa-chart-pie', text: `Kategori pengeluaran terbesar adalah <strong>${category}</strong> dengan total ${formatIDR(amount)} (${percentage}% dari total pengeluaran)` });
  }
  if (totals.expense > totals.income) {
    const deficit = totals.expense - totals.income;
    insights.push({ icon: 'fa-exclamation-triangle', text: `<strong>Peringatan:</strong> Pengeluaran melebihi pemasukan sebesar ${formatIDR(deficit)}. Pertimbangkan untuk meninjau kembali anggaran.` });
  } else if (totals.income > totals.expense) {
    const surplus = totals.income - totals.expense;
    insights.push({ icon: 'fa-thumbs-up', text: `<strong>Bagus:</strong> Terdapat surplus sebesar ${formatIDR(surplus)}. Pertimbangkan untuk menyisihkan sebagian untuk dana darurat.` });
  }
  if (transactions.length > 50) {
    const avgTransactionValue = (totals.income + totals.expense) / (transactions.length || 1);
    insights.push({ icon: 'fa-calculator', text: `Rata-rata nilai per transaksi adalah ${formatIDR(avgTransactionValue)} dari ${(transactions.length)} transaksi total.` });
  }
  if (insights.length === 0) {
    insights.push({ icon: 'fa-info-circle', text: 'Tidak ada insight khusus untuk periode ini. Lanjutkan pencatatan transaksi untuk analisis yang lebih mendalam.' });
  }
  insights.forEach(insight => {
    const item = document.createElement('div');
    item.className = 'insight-item';
    item.innerHTML = `
      <i class="fas ${insight.icon}"></i>
      <div class="insight-content">${insight.text}</div>
    `;
    container.appendChild(item);
  });
}

// Reports management
function loadReports() {
  try { appState.reports = JSON.parse(localStorage.getItem('financial_reports') || '[]') as Report[] } catch { appState.reports = [] }
}
function saveReports() {
  try { localStorage.setItem('financial_reports', JSON.stringify(appState.reports)) } catch (error) { console.warn('Could not save reports:', error) }
}

function renderReportsTable() {
  const tbody = document.getElementById('report-tbody');
  const noteElement = document.getElementById('active-report-note');
  if (!tbody) return;
  if (!appState.reports || appState.reports.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6" class="empty-state">
          <div class="empty-content">
            <i class="fas fa-inbox"></i>
            <p>Belum ada laporan tersimpan</p>
          </div>
        </td>
      </tr>
    `;
    if (noteElement) noteElement.textContent = '';
    return;
  }

  tbody.innerHTML = appState.reports.map(report => {
    const isActive = report.id === appState.activeReportId;
    const totals = report.totals || { income: 0, expense: 0, balance: 0 };
    return `
      <tr ${isActive ? 'style="background-color: rgba(59, 130, 246, 0.05);"' : ''}>
        <td style="font-weight: 700;">
          <div>${report.title}</div>
          ${report.type || report.author ? `
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              ${report.type ? `Tipe: ${report.type}` : ''}
              ${report.type && report.author ? ' • ' : ''}
              ${report.author ? `Penyusun: ${report.author}` : ''}
            </div>
          ` : ''}
        </td>
        <td>${formatDateID(report.startDate)} — ${formatDateID(report.endDate)}</td>
        <td class="text-right">${formatIDR(totals.balance)}</td>
        <td class="text-right">${formatIDR(totals.income)}</td>
        <td class="text-right">${formatIDR(totals.expense)}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="action-btn secondary" data-action="load" data-id="${report.id}">
              <i class="fas fa-eye"></i>
              <span>Muat</span>
            </button>
            <button class="action-btn" data-action="delete" data-id="${report.id}" style="background: var(--error-50); border-color: var(--error-200); color: var(--error-600);">
              <i class="fas fa-trash"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for report actions
  (tbody.querySelectorAll('button[data-action="load"]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
    btn.addEventListener('click', () => {
      const reportId = btn.getAttribute('data-id');
      loadReport(reportId || '');
    });
  });
  (tbody.querySelectorAll('button[data-action="delete"]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
    btn.addEventListener('click', () => {
      const reportId = btn.getAttribute('data-id');
      deleteReport(reportId || '');
    });
  });

  if (noteElement) {
    const activeReport = appState.reports.find(r => r.id === appState.activeReportId);
    if (activeReport) {
      noteElement.textContent = `Laporan aktif: "${activeReport.title}" (${formatDateID(activeReport.startDate)} — ${formatDateID(activeReport.endDate)})`;
    } else {
      noteElement.textContent = '';
    }
  }
}

function loadReport(reportId: string) {
  const report = appState.reports.find(r => String(r.id) === String(reportId));
  if (report) {
    appState.activeReportId = report.id;
    appState.filters.start = report.startDate;
    appState.filters.end = report.endDate;
    appState.filters.preset = 'custom';
    updateFiltersUI();
    refreshDashboard();
    showToast('Laporan berhasil dimuat', 'success');
  }
}

function deleteReport(reportId: string) {
  const reportIndex = appState.reports.findIndex(r => String(r.id) === String(reportId));
  if (reportIndex >= 0) {
    const deletedReport = appState.reports.splice(reportIndex, 1)[0];
    if (appState.activeReportId === deletedReport.id) appState.activeReportId = null;
    saveReports();
    renderReportsTable();
    showToast('Laporan berhasil dihapus', 'warning');
  }
}

// Monthly dues management
function loadResidents(): Array<{ id: string | number; nama: string; status?: string }> {
  try { return (JSON.parse(localStorage.getItem('residents_data') || '[]') as any[]).filter(resident => resident.status === 'aktif') } catch { return [] }
}
function getCurrentWeekKey() {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);
  return toISODate(monday);
}
function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function renderDuesSection() {
  const duesConfig = getDuesConfig();
  const amountInput = document.getElementById('iuran-amount') as HTMLInputElement | null;
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  if (amountInput && !amountInput.value) amountInput.value = String((duesConfig as any).amount || 0);
  if (monthInput && !monthInput.value) monthInput.value = (duesConfig as any).month || getCurrentMonth();

  const residents = loadResidents();
  const payments = getDuesPayments() as Record<string, { paid: string[] }>;
  const weekKey = getCurrentWeekKey();
  const weekPayments = payments[weekKey] || { paid: [] };
  const paidSet = new Set((weekPayments.paid || []).map(String));

  const paidResidents = residents.filter(r => paidSet.has(String(r.id)));
  const pendingResidents = residents.filter(r => !paidSet.has(String(r.id)));

  const paidContainer = document.getElementById('iuran-paid');
  const pendingContainer = document.getElementById('iuran-pending');

  if (paidContainer) {
    if (paidResidents.length > 0) {
      paidContainer.innerHTML = paidResidents.map(resident => `
        <div class="status-pill">
          <span class="pill-name">${resident.nama}</span>
          <span class="pill-status">Lunas</span>
        </div>
      `).join('');
    } else {
      paidContainer.innerHTML = '<div class="loading-state">Belum ada pembayaran minggu ini</div>';
    }
  }

  if (pendingContainer) {
    if (pendingResidents.length > 0) {
      pendingContainer.innerHTML = pendingResidents.map(resident => `
        <div class="status-pill">
          <span class="pill-name">${resident.nama}</span>
          <button class="action-btn secondary" data-pay-resident="${resident.id}">
            <i class="fas fa-check"></i>
            <span>Tandai Bayar</span>
          </button>
        </div>
      `).join('');
      (pendingContainer.querySelectorAll('button[data-pay-resident]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
        btn.addEventListener('click', () => {
          const residentId = btn.getAttribute('data-pay-resident') || '';
          markDuesPaid(residentId);
        });
      });
    } else {
      pendingContainer.innerHTML = '<div class="loading-state">Semua warga sudah membayar</div>';
    }
  }
}

function getDuesConfig(): { amount?: number; month?: string } {
  try { return JSON.parse(localStorage.getItem('dues_config') || '{}') } catch { return {} }
}
function saveDuesConfig(config: { amount?: number; month?: string }) {
  try { localStorage.setItem('dues_config', JSON.stringify(config)) } catch (error) { console.warn('Could not save dues config:', error) }
}
function getDuesPayments(): Record<string, { paid: string[] }> {
  try { return JSON.parse(localStorage.getItem('dues_payments') || '{}') } catch { return {} as any }
}
function saveDuesPayments(payments: Record<string, { paid: string[] }>) {
  try { localStorage.setItem('dues_payments', JSON.stringify(payments)) } catch (error) { console.warn('Could not save dues payments:', error) }
}
function markDuesPaid(residentId: string | number) {
  const payments = getDuesPayments();
  const weekKey = getCurrentWeekKey();
  if (!payments[weekKey]) payments[weekKey] = { paid: [] };
  const paidList = payments[weekKey].paid || [];
  const idStr = String(residentId);
  if (!paidList.includes(idStr)) {
    paidList.push(idStr);
    payments[weekKey].paid = paidList;
    saveDuesPayments(payments);
    renderDuesSection();
    showToast('Pembayaran berhasil dicatat', 'success');
  }
}

// CSV Export
function exportToCSV(transactions: Transaction[]) {
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Jumlah'];
  const rows = transactions.map(t => [ formatDateID(t.date), t.type, t.category, (t.description || '').replace(/"/g, '""'), t.amount ]);
  const csvContent = [headers, ...rows].map(row => row.map(field => typeof field === 'number' ? field : `"${String(field)}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-keuangan-${appState.filters.start}-${appState.filters.end}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// UI Update functions
function updateFiltersUI() {
  const startInput = document.getElementById('filter-start') as HTMLInputElement | null;
  const endInput = document.getElementById('filter-end') as HTMLInputElement | null;
  const searchInput = document.getElementById('filter-q') as HTMLInputElement | null;
  const minInput = document.getElementById('filter-min') as HTMLInputElement | null;
  const maxInput = document.getElementById('filter-max') as HTMLInputElement | null;
  if (startInput) startInput.value = appState.filters.start || '';
  if (endInput) endInput.value = appState.filters.end || '';
  if (searchInput) searchInput.value = appState.filters.search || '';
  if (minInput) minInput.value = appState.filters.minAmount ? String(appState.filters.minAmount) : '';
  if (maxInput) maxInput.value = appState.filters.maxAmount ? String(appState.filters.maxAmount) : '';
  document.querySelectorAll<HTMLElement>('.filter-chip').forEach(chip => {
    const isActive = chip.dataset.preset === appState.filters.preset;
    chip.classList.toggle('active', !!isActive);
  });
}

// Main dashboard refresh
function refreshDashboard() {
  updateFiltersUI();
  let transactions = getFilteredTransactions();
  if (transactions.length === 0 && appState.transactions.length > 0) {
    initializeData();
    transactions = getFilteredTransactions();
  }
  const totals = calculateTotals(transactions);
  animateValue(document.getElementById('sum-in'), (totals as any).income, formatIDR);
  animateValue(document.getElementById('sum-out'), (totals as any).expense, formatIDR);
  animateValue(document.getElementById('sum-bal'), (totals as any).balance, formatIDR);
  animateValue(document.getElementById('sum-count'), (totals as any).count, formatNumber as any);
  if (transactions.length > 0 && (window as any).Chart) createCharts(transactions); else showEmptyCharts();
  detectAnomalies(transactions);
  generateInsights(transactions);
  renderReportsTable();
  renderDuesSection();
  try { localStorage.setItem('dashboard_filters', JSON.stringify(appState.filters)) } catch (error) { console.warn('Could not save filters:', error) }
}

// Drawer management
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('drawer-backdrop');
function openDrawer() {
  if (drawer && backdrop) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    const startInput = document.getElementById('rep-start') as HTMLInputElement | null;
    const endInput = document.getElementById('rep-end') as HTMLInputElement | null;
    const titleInput = document.getElementById('rep-title') as HTMLInputElement | null;
    if (startInput) startInput.value = appState.filters.start || '';
    if (endInput) endInput.value = appState.filters.end || '';
    if (titleInput) {
      const currentDate = new Date(appState.filters.start || new Date());
      const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      titleInput.value = `Laporan Keuangan ${monthName}`;
    }
    updateReportPreview();
  }
}
function closeDrawer() { if (drawer && backdrop) { drawer.classList.remove('open'); backdrop.classList.remove('open') } }

// Report form management
function collectAdjustments(): Adjustment[] {
  const adjustments: Adjustment[] = [];
  const adjustmentRows = document.querySelectorAll('.adjustment-row');
  adjustmentRows.forEach(row => {
    const r = row as HTMLElement;
    const description = (r.querySelector('[data-field="description"]') as HTMLInputElement | null)?.value.trim();
    const type = (r.querySelector('[data-field="type"]') as HTMLSelectElement | null)?.value as TxType || 'Masuk';
    const category = (r.querySelector('[data-field="category"]') as HTMLInputElement | null)?.value.trim();
    const amount = Number((r.querySelector('[data-field="amount"]') as HTMLInputElement | null)?.value) || 0;
    if (description && amount > 0) adjustments.push({ description, type, amount, category });
  });
  return adjustments;
}

function addAdjustmentRow(data: Partial<Adjustment> = {}) {
  const container = document.getElementById('adj-list');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'adjustment-row';
  row.innerHTML = `
    <div class="input-group">
      <label>Deskripsi</label>
      <input type="text" data-field="description" placeholder="Contoh: Koreksi Mutasi Bank" value="${(data.description || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="input-group">
      <label>Tipe</label>
      <select data-field="type">
        <option value="Masuk" ${data.type === 'Masuk' ? 'selected' : ''}>Masuk</option>
        <option value="Keluar" ${data.type === 'Keluar' ? 'selected' : ''}>Keluar</option>
      </select>
    </div>
    <div class="input-group">
      <label>Kategori</label>
      <input type="text" data-field="category" placeholder="Opsional" value="${(data.category || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="input-group">
      <label>Jumlah</label>
      <input type="number" data-field="amount" min="0" step="1000" placeholder="0" value="${Number(data.amount ?? '') || ''}" />
    </div>
    <button type="button" class="delete-btn" title="Hapus penyesuaian">
      <i class="fas fa-trash"></i>
    </button>
  `;
  (row.querySelector('.delete-btn') as HTMLButtonElement).addEventListener('click', () => { row.remove(); updateReportPreview() });
  row.querySelectorAll('input, select').forEach(input => { input.addEventListener('input', updateReportPreview) });
  container.appendChild(row);
  updateReportPreview();
}

function updateReportPreview() {
  const previewIncome = document.getElementById('pv-in');
  const previewExpense = document.getElementById('pv-out');
  const previewBalance = document.getElementById('pv-bal');
  if (!previewIncome || !previewExpense || !previewBalance) return;
  const startDate = (document.getElementById('rep-start') as HTMLInputElement | null)?.value;
  const endDate = (document.getElementById('rep-end') as HTMLInputElement | null)?.value;
  if (!startDate || !endDate) { previewIncome.textContent = previewExpense.textContent = previewBalance.textContent = '—'; return }
  const periodTransactions = appState.transactions.filter(t => t.date >= startDate && t.date <= endDate);
  const baseTotals = calculateTotals(periodTransactions) as any as ReportTotals & { count: number };
  const adjustments = collectAdjustments();
  const adjustmentIncome = adjustments.filter(adj => adj.type === 'Masuk').reduce((sum, adj) => sum + adj.amount, 0);
  const adjustmentExpense = adjustments.filter(adj => adj.type === 'Keluar').reduce((sum, adj) => sum + adj.amount, 0);
  const finalTotals: ReportTotals = { income: baseTotals.income + adjustmentIncome, expense: baseTotals.expense + adjustmentExpense, balance: 0 };
  finalTotals.balance = finalTotals.income - finalTotals.expense;
  previewIncome.textContent = formatIDR(finalTotals.income);
  previewExpense.textContent = formatIDR(finalTotals.expense);
  previewBalance.textContent = formatIDR(finalTotals.balance);
}

// Initialize application
function initializeApp() {
  initializeData();
  loadReports();
  try {
    const savedFilters = JSON.parse(localStorage.getItem('dashboard_filters') || '{}') as Partial<Filters>;
    Object.assign(appState.filters, savedFilters);
    appState.filters.minAmount = 0;
    appState.filters.maxAmount = 0;
    if (!appState.filters.start || !appState.filters.end) applyFilterPreset('bulan-ini');
  } catch { applyFilterPreset('bulan-ini') }
  setupEventListeners();
  refreshDashboard();
}

function setupEventListeners() {
  document.querySelectorAll<HTMLElement>('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const preset = chip.dataset.preset || '';
      applyFilterPreset(preset);
      refreshDashboard();
    });
  });

  const filterInputs: Array<{ id: string; key: keyof Filters; transform?: (v: string) => any }> = [
    { id: 'filter-start', key: 'start' },
    { id: 'filter-end', key: 'end' },
    { id: 'filter-q', key: 'search' },
    { id: 'filter-min', key: 'minAmount', transform: Number },
    { id: 'filter-max', key: 'maxAmount', transform: Number }
  ];
  filterInputs.forEach(({ id, key, transform }) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        (appState.filters as any)[key] = transform ? (transform(target.value) || 0) : target.value;
        appState.filters.preset = 'custom';
        refreshDashboard();
      });
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    applyFilterPreset('bulan-ini');
    appState.filters.search = '';
    appState.filters.minAmount = 0;
    appState.filters.maxAmount = 0;
    refreshDashboard();
    showToast('Filter berhasil direset', 'info');
  });

  document.getElementById('btn-print')?.addEventListener('click', () => { window.print() });
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const transactions = getFilteredTransactions();
    exportToCSV(transactions);
    showToast('Data berhasil diekspor ke CSV', 'success');
  });

  document.getElementById('btn-open-drawer')?.addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer);

  const reportForm = document.getElementById('form-report') as HTMLFormElement | null;
  if (reportForm) reportForm.addEventListener('submit', handleReportSubmit);

  document.getElementById('btn-add-adj')?.addEventListener('click', () => { addAdjustmentRow() });

  ['rep-start', 'rep-end'].forEach(id => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.addEventListener('change', updateReportPreview);
  });

  document.getElementById('iuran-save')?.addEventListener('click', () => {
    const amount = Number((document.getElementById('iuran-amount') as HTMLInputElement | null)?.value) || 0;
    const month = (document.getElementById('iuran-month') as HTMLInputElement | null)?.value || getCurrentMonth();
    saveDuesConfig({ amount, month });
    showToast('Pengaturan iuran berhasil disimpan', 'success');
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() });
}

function handleReportSubmit(event: Event) {
  event.preventDefault();
  const formData = {
    title: (document.getElementById('rep-title') as HTMLInputElement | null)?.value.trim(),
    startDate: (document.getElementById('rep-start') as HTMLInputElement | null)?.value,
    endDate: (document.getElementById('rep-end') as HTMLInputElement | null)?.value,
    type: (document.getElementById('rep-type') as HTMLSelectElement | null)?.value || 'Bulanan',
    source: (document.getElementById('rep-source') as HTMLSelectElement | null)?.value || 'Gabungan',
    author: (document.getElementById('rep-owner') as HTMLInputElement | null)?.value.trim() || '',
    reference: (document.getElementById('rep-ref') as HTMLInputElement | null)?.value.trim() || '',
    tags: ((document.getElementById('rep-tags') as HTMLInputElement | null)?.value || '').split(',').map(t => t.trim()).filter(Boolean),
    includeZero: (document.getElementById('rep-include-zero') as HTMLInputElement | null)?.checked || false,
    notes: (document.getElementById('rep-note') as HTMLTextAreaElement | null)?.value.trim() || ''
  };

  const errors: Record<string, string> = {};
  if (!formData.title) errors.title = 'Judul laporan wajib diisi';
  if (!formData.startDate) errors.start = 'Tanggal mulai wajib diisi';
  if (!formData.endDate) errors.end = 'Tanggal akhir wajib diisi';
  if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) errors.end = 'Tanggal akhir harus lebih besar atau sama dengan tanggal mulai';

  ['title', 'start', 'end'].forEach(field => {
    const errorElement = document.getElementById(`err-${field}`);
    if (errorElement) errorElement.textContent = errors[field] || '';
  });
  if (Object.keys(errors).length > 0) return;

  const periodTransactions = appState.transactions.filter(t => t.date >= (formData.startDate || '') && t.date <= (formData.endDate || ''));
  const baseTotals = calculateTotals(periodTransactions) as any as ReportTotals & { count: number };
  const adjustments = collectAdjustments();
  const adjustmentIncome = adjustments.filter(adj => adj.type === 'Masuk').reduce((sum, adj) => sum + adj.amount, 0);
  const adjustmentExpense = adjustments.filter(adj => adj.type === 'Keluar').reduce((sum, adj) => sum + adj.amount, 0);
  const finalTotals: ReportTotals = { income: baseTotals.income + adjustmentIncome, expense: baseTotals.expense + adjustmentExpense, balance: 0 };
  finalTotals.balance = finalTotals.income - finalTotals.expense;

  const report: Report = { id: Date.now(), ...(formData as any), adjustments, totals: finalTotals, createdAt: new Date().toISOString() };
  appState.reports.unshift(report);
  appState.activeReportId = report.id;
  saveReports();

  appState.filters.start = formData.startDate || '';
  appState.filters.end = formData.endDate || '';
  appState.filters.preset = 'custom';

  refreshDashboard();
  (event.target as HTMLFormElement)?.reset();
  const adjList = document.getElementById('adj-list');
  if (adjList) adjList.innerHTML = '';
  closeDrawer();
  showToast('Laporan berhasil dibuat dan disimpan', 'success');
}

// Chart.js configuration
function configureChartDefaults() {
  if ((window as any).Chart) {
    const Chart = (window as any).Chart;
    Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    Chart.defaults.color = '#6b7280';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleFont = { weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { weight: '500' };
  }
}

// Script loading and initialization
script.onload = () => { configureChartDefaults(); initializeApp() };
script.onerror = () => { console.error('Failed to load Chart.js'); removeSkeletons(); showEmptyCharts(); initializeApp() };
setTimeout(() => { if (!(window as any).Chart) { console.warn('Chart.js loading timeout'); removeSkeletons(); showEmptyCharts() } }, 3000);
setTimeout(initializeApp, 100);
