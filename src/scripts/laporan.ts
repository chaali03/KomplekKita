// Financial Report Dashboard Script (extracted from laporan.astro)
// TypeScript version with minimal typings to eliminate implicit any diagnostics

// Global Chart type (loaded via script tag at runtime)
declare global {
  interface Window { 
    Chart: any;
    chartUpdateManager: any;
  }
}

// Shared finance utilities for consistent KPI calculations across pages
import { calculateTotals as calcShared, applyFiltersSync as filterShared, type FilterOptions } from '~/utils/finance';
import { iuranManager } from './iuran-manager';

// Quick-save current filtered period as a report snapshot
function saveCurrentAsReport(){
  const start = appState.filters.start;
  const end = appState.filters.end;
  if (!start || !end) {
    applyFilterPreset('bulan-ini');
  }
  const s = appState.filters.start;
  const e = appState.filters.end;
  const rows = getFilteredTransactions();
  const totals = calculateTotals(rows) as any as ReportTotals & { count: number };
  const monthName = new Date((s||'').slice(0,7) + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const title = `Laporan Keuangan ${monthName}`;
  const report: Report = {
    id: Date.now(),
    title,
    startDate: s,
    endDate: e,
    type: 'Snapshot',
    source: 'Laporan',
    author: '',
    reference: '',
    tags: [],
    includeZero: false,
    notes: `Snapshot otomatis dari filter aktif (${formatDateID(s)}—${formatDateID(e)}) dengan ${rows.length} transaksi` as any,
    adjustments: [],
    totals: { income: totals.income, expense: totals.expense, balance: totals.income - totals.expense },
    createdAt: new Date().toISOString()
  };
  appState.reports.unshift(report);
  appState.activeReportId = report.id;
  saveReports();
  renderReportsTable();
  showToast('Snapshot laporan disimpan ke Riwayat', 'success');
  try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
}

// Export a specific report period quickly to XLSX
async function exportReport(reportId: string){
  const report = appState.reports.find(r => String(r.id) === String(reportId));
  if (!report) return;
  const rows = appState.transactions.filter(t => t.date >= report.startDate && t.date <= report.endDate);
  const groups = [{ name: `${report.title}`.substring(0,31), rows }];
  try {
    await exportXLSX(groups);
    showToast('Ekspor laporan berhasil dimulai', 'success');
  } catch (e) {
    console.warn(e);
    showToast('Gagal mengekspor laporan', 'error');
  }
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

// Snapshot of transaction-style inputs used when creating a report
interface ReportSnapshot {
  txType?: TxType;
  formType?: string;
  txDate?: string; // ISO date
  txCategory?: string;
  txAmount?: number;
  txDesc?: string;
}

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
  // Optional form snapshot to reflect exact admin inputs at creation time
  snapshot?: ReportSnapshot;
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

// ===== API helpers (shared style with other pages) =====
function resolveKomplekId(){
  try {
    const url = new URL(window.location.href);
    let id = url.searchParams.get('komplek_id') || localStorage.getItem('komplek_id') || '1';
    if(id){ localStorage.setItem('komplek_id', String(id)); }
    return id;
  } catch { return localStorage.getItem('komplek_id') || '1'; }
}

async function fetchJson(url: string){
  const res = await fetch(url, { headers: { 'Accept':'application/json' } });
  if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status}: ${t}`); }
  return res.json();
}

async function postJson(url: string, body: any){
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Accept':'application/json', 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await res.json() : await res.text().catch(()=> '');
  if(!res.ok){
    const msg = typeof payload === 'string' ? payload : (payload?.message || JSON.stringify(payload));
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return payload;
}

// Notification system (centered modal replacement)
function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const titleMap: Record<typeof type, string> = {
    info: 'Informasi',
    success: 'Berhasil',
    warning: 'Peringatan',
    error: 'Terjadi Kesalahan'
  } as const;
  showCenterModal(titleMap[type] || 'Informasi', message, type);
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
  // Do NOT auto-generate demo data here to avoid divergence with transaksi.astro
  if (!Array.isArray(appState.transactions)) appState.transactions = [];
}

// Create demo residents if none exist (used in demo mode only)
function ensureDemoResidents(){
  try {
    // Check if real warga data exists first
    const wargaData = JSON.parse(localStorage.getItem('warga_data_v1') || '[]');
    if (Array.isArray(wargaData) && wargaData.length > 0) return;
    
    // Check if demo residents already exist
    const existing = JSON.parse(localStorage.getItem('residents_data') || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    
    // Only create demo data if no real data exists
    const names = [
      'Ahmad Fauzi','Siti Aminah','Budi Santoso','Dewi Lestari','Rizky Pratama',
      'Nur Aisyah','Andi Wijaya','Rina Marlina','Fajar Nugraha','Putri Ayu',
      'Yusuf Maulana','Tri Handayani','Agus Salim','Nadia Safira','Hendra Saputra',
      'Intan Pertiwi','Rudi Hartono','Mega Putri','Taufik Hidayat','Anisa Rahma'
    ];
    const demo = names.map((nama, idx) => ({ id: idx + 1, nama, status: 'aktif' }));
    localStorage.setItem('residents_data', JSON.stringify(demo));
  } catch {}
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
    case 'qtd': {
      const now = new Date();
      const month = now.getMonth(); // 0-11
      const qStartMonth = Math.floor(month / 3) * 3; // 0,3,6,9
      const start = new Date(now.getFullYear(), qStartMonth, 1);
      appState.filters.start = toISODate(start);
      appState.filters.end = toISODate(now);
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
  const filterOptions: FilterOptions = {
    start: f.start,
    end: f.end,
    search: f.search,
    minAmount: f.minAmount ? Number(f.minAmount) : undefined,
    maxAmount: f.maxAmount ? Number(f.maxAmount) : undefined
  };
  const filtered = filterShared(appState.transactions, filterOptions);
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate totals
function calculateTotals(transactions: Transaction[]) {
  // Delegate to shared utility to ensure parity with transaksi page
  const { income, expense, balance, count } = calcShared(transactions as any);
  return { income, expense, balance, count } as ReportTotals & { count: number };
}

// Generate daily series for charts
function generateDailySeries(transactions: Transaction[]) {
  // Prevent future dates from appearing in charts
  const todayISO = toISODate(new Date());
  const safeTx = (transactions || []).filter(t => t && t.date && t.date <= todayISO);
  const dates = Array.from(new Set(safeTx.map(t => t.date))).sort();
  const dailyIncome = dates.map(date => safeTx.filter(t => t.date === date && t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0));
  const dailyExpense = dates.map(date => safeTx.filter(t => t.date === date && t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0));
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

/**
 * Initialize Real-time Chart Updates untuk Laporan
 */
function initRealTimeCharts() {
  // Pastikan ChartUpdateManager tersedia
  if (!window.chartUpdateManager) {
    console.warn('[Laporan] ChartUpdateManager not available, skipping real-time updates');
    return;
  }

  // Data fetcher untuk chart updates
  async function fetchChartData() {
    try {
      // Baca data dari localStorage
      const localData = localStorage.getItem('financial_transactions_v2');
      if (localData) {
        const transactions = JSON.parse(localData);
        if (Array.isArray(transactions) && transactions.length > 0) {
          const series = generateDailySeries(transactions as Transaction[]);
          const totals = calculateTotals(transactions as Transaction[]);
          
          return {
            transactions: transactions as Transaction[],
            series,
            totals
          };
        }
      }
    } catch (error) {
      console.warn('[Laporan] Failed to fetch chart data:', error);
    }

    // Return default data jika gagal
    return {
      transactions: [],
      series: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        dates: ['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01'],
        dailyIncome: [900000, 1200000, 1150000, 1400000, 1500000, 1600000],
        dailyExpense: [500000, 700000, 650000, 800000, 900000, 850000],
        cumulativeBalance: [400000, 900000, 1400000, 2000000, 2600000, 3350000]
      },
      totals: {
        income: 7750000,
        expense: 4400000,
        balance: 3350000,
        count: 0
      }
    };
  }

  // Update function untuk Balance Chart
  function updateBalanceChart(newData: any) {
    const chart = appState.charts.balance;
    if (!chart) return;

    chart.data.labels = newData.series.labels;
    chart.data.datasets[0].data = newData.series.cumulativeBalance;
    chart.update('active');
  }

  // Update function untuk Composition Chart
  function updateCompositionChart(newData: any) {
    const chart = appState.charts.composition;
    if (!chart) return;

    chart.data.datasets[0].data = [newData.totals.income, newData.totals.expense];
    chart.update('active');
  }

  // Update function untuk Trends Chart
  function updateTrendsChart(newData: any) {
    const chart = appState.charts.trends;
    if (!chart) return;

    chart.data.labels = newData.series.labels;
    chart.data.datasets[0].data = newData.series.dailyIncome;
    chart.data.datasets[1].data = newData.series.dailyExpense;
    chart.update('active');
  }

  // Register semua chart untuk auto-update
  const charts = [
    { id: 'lap-balance', instance: appState.charts.balance, updateFn: updateBalanceChart },
    { id: 'lap-mix', instance: appState.charts.composition, updateFn: updateCompositionChart },
    { id: 'lap-inout', instance: appState.charts.trends, updateFn: updateTrendsChart }
  ];

  charts.forEach(({ id, instance, updateFn }) => {
    if (instance) {
      window.chartUpdateManager.registerChart(
        id,
        instance,
        fetchChartData,
        updateFn
      );
      console.log(`[Laporan] Registered ${id} for real-time updates`);
    }
  });

  // Set update frequency ke 30 detik
  window.chartUpdateManager.setUpdateFrequency(30000);

  // Listen untuk perubahan data dari halaman lain
  window.addEventListener('storage', (e) => {
    if (e.key === 'financial_transactions_v2') {
      console.log('[Laporan] Detected data change, updating charts...');
      window.chartUpdateManager.updateAllCharts();
    }
  });

  // Listen untuk custom events
  window.addEventListener('chart-data-updated', () => {
    console.log('[Laporan] Received chart-data-updated event');
    window.chartUpdateManager.updateAllCharts();
  });

  console.log('[Laporan] Real-time chart updates initialized');
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
  const stdExpense = stddev(series.dailyExpense);

  type Anomaly = { date: string; type: 'critical' | 'warning'; message: string };
  const anomalies: Anomaly[] = [];

  // Rule A: Daily expense z-score > 2.5 (critical)
  for (let i = 0; i < series.dates.length; i++) {
    const dayIncome = series.dailyIncome[i];
    const dayExpense = series.dailyExpense[i];
    if (stdExpense > 0) {
      const z = (dayExpense - avgExpense) / stdExpense;
      if (z > 2.5 && dayExpense > 0) {
        anomalies.push({ date: series.dates[i], type: 'critical', message: `Pengeluaran ${formatIDR(dayExpense)} tidak biasa (z-score ${z.toFixed(2)} > 2.5) dibanding rata-rata harian ${formatIDR(avgExpense)}` });
        continue; // already critical, skip other checks for the same day
      }
    }
    // Rule B: Same-day expense > 3× same-day income (warning)
    if (dayExpense > (dayIncome * 3) && dayExpense > 0 && dayIncome > 0) {
      anomalies.push({ date: series.dates[i], type: 'warning', message: `Pengeluaran ${formatIDR(dayExpense)} > 3× pemasukan hari yang sama (${formatIDR(dayIncome)})` });
    }
  }

  // Rule C: Per-category transaction amount > 3× median of that category (warning)
  const expenseByCategory: Record<string, number[]> = {};
  transactions.filter(t => t.type === 'Keluar').forEach(t => {
    if (!expenseByCategory[t.category]) expenseByCategory[t.category] = [];
    expenseByCategory[t.category].push(t.amount);
  });
  const categoryMedian: Record<string, number> = {};
  Object.keys(expenseByCategory).forEach(cat => { categoryMedian[cat] = median(expenseByCategory[cat]); });
  transactions.forEach(t => {
    if (t.type !== 'Keluar') return;
    const med = categoryMedian[t.category] || 0;
    if (med > 0 && t.amount > 3 * med) {
      anomalies.push({ date: t.date, type: 'warning', message: `Transaksi kategori ${t.category} sebesar ${formatIDR(t.amount)} melebihi 3× median kategori (${formatIDR(med)})` });
    }
  });

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

  // Persist anomalies snapshot for this period
  try {
    const payload = {
      period: { start: appState.filters.start, end: appState.filters.end, preset: appState.filters.preset },
      generatedAt: new Date().toISOString(),
      items: anomalies
    };
    localStorage.setItem('lap_anomalies_snapshot', JSON.stringify(payload));
  } catch {}
}

// Basic stats helpers for anomaly detection
function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function stddev(values: number[]): number {
  if (!values.length) return 0;
  const m = mean(values);
  const variance = mean(values.map(v => (v - m) * (v - m)));
  return Math.sqrt(variance);
}
function median(values: number[]): number {
  if (!values.length) return 0;
  const arr = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
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

  // Persist insights snapshot for this period
  try {
    const payload = {
      period: { start: appState.filters.start, end: appState.filters.end, preset: appState.filters.preset },
      generatedAt: new Date().toISOString(),
      items: insights
    };
    localStorage.setItem('lap_insights_snapshot', JSON.stringify(payload));
  } catch {}
}

// Reports management
function loadReports() {
  try { appState.reports = JSON.parse(localStorage.getItem('financial_reports') || '[]') as Report[] } catch { appState.reports = [] }
  // Purge auto-generated monthly summaries (author: System) per request
  const before = appState.reports.length;
  appState.reports = appState.reports.filter(r => !(r?.author === 'System' && (r?.type === 'Bulanan' || String(r?.title||'').toLowerCase().includes('ringkasan bulanan'))));
  if (appState.reports.length !== before) {
    saveReports();
  }
}
function saveReports() {
  try { localStorage.setItem('financial_reports', JSON.stringify(appState.reports)) } catch (error) { console.warn('Could not save reports:', error) }
}

// Auto-upsert monthly report is disabled per request (avoid system-generated summaries)
function upsertAutoMonthlyReport(isoDate: string) {
  return; // no-op
}

function renderReportsTable() {
  const tbody = document.getElementById('report-tbody');
  const noteElement = document.getElementById('active-report-note');
  if (!tbody) return;
  // Compute the latest balance according to current filters (same as KPI 'Saldo Akhir')
  const currentFiltered = getFilteredTransactions();
  const currentTotals = calculateTotals(currentFiltered);
  const currentBalance = currentTotals.balance;
  if (!appState.reports || appState.reports.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7" class="empty-state">
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

  // Helper: compute cumulative balance up to and including a specific date
  const balanceUpTo = (date: string): number => {
    const txs = appState.transactions.filter(t => t.date <= date);
    const inc = txs.filter(t => t.type === 'Masuk').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'Keluar').reduce((s, t) => s + t.amount, 0);
    return inc - exp;
  };

  tbody.innerHTML = appState.reports.map(report => {
    const isActive = report.id === appState.activeReportId;
    const snap = report.snapshot;
    const snapHtml = snap ? `
        <div class="cell-sub">
          ${snap.formType ? `${snap.formType}` : ''}
          ${snap.txDate ? ` ${formatDateID(snap.txDate)}` : ''}
          ${snap.txCategory ? ` • ${snap.txCategory}` : ''}
          ${typeof snap.txAmount === 'number' && (snap.txAmount as number) > 0 ? ` • Rp ${formatIDR(snap.txAmount as number)}` : ''}
          ${snap.txDesc ? `<div class="cell-sub quote">&quot;${(snap.txDesc || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}&quot;</div>` : ''}
        </div>
      `
      : '';

    // Determine fields for new columns
    const periodeText = snap?.txDate ? formatDateID(snap.txDate) : `${formatDateID(report.startDate)} — ${formatDateID(report.endDate)}`;
    const tipeText = snap?.formType ? snap.formType : (report.type || '-');
    const ketText = (snap?.txDesc && snap.txDesc.trim().length > 0) ? snap.txDesc : '-';
    const jumlahText = (typeof snap?.txAmount === 'number' && (snap?.txAmount as number) > 0) ? `<span class="amount">${formatIDR(snap!.txAmount as number)}</span>` : '-';
    // Align with dashboard's latest balance
    const saldoSekarang = currentBalance;
    return `
      <tr ${isActive ? 'data-active-row="true"' : ''}>
        <td>
          <div class="cell-main">${report.title}</div>
          ${snapHtml}
          ${report.type || report.author ? `
            <div class="cell-hint">
              ${report.type ? `Tipe: ${report.type}` : ''}
              ${report.type && report.author ? ' • ' : ''}
              ${report.author ? `Penyusun: ${report.author}` : ''}
            </div>
          ` : ''}
        </td>
        <td>${periodeText}</td>
        <td>${tipeText}</td>
        <td>${ketText}</td>
        <td class="text-right num-col">${jumlahText}</td>
        <td class="text-right num-col"><span class="amount">${formatIDR(saldoSekarang)}</span></td>
        <td>
          <button class="btn soft small pressable" data-action="delete" data-id="${report.id}"><i class="fas fa-trash"></i> <span>Hapus</span></button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for report actions
  // Load/Export buttons were removed from UI
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
  if (reportIndex < 0) return;
  const deletedReport = appState.reports.splice(reportIndex, 1)[0];

  // If report has a transaction snapshot, attempt to rollback/remove that transaction
  const snap = deletedReport?.snapshot;
  if (snap && snap.txType && typeof snap.txAmount === 'number' && snap.txAmount > 0) {
    // Find matching transaction by date, type, amount (and optionally category/desc)
    const idx = appState.transactions.findIndex(t =>
      (!snap.txDate || t.date === snap.txDate) &&
      t.type === snap.txType &&
      t.amount === snap.txAmount &&
      (!snap.txCategory || t.category === snap.txCategory) &&
      (!snap.txDesc || (t.description || '') === snap.txDesc)
    );
    if (idx >= 0) {
      const removed = appState.transactions.splice(idx, 1)[0];
      // Persist and refresh, expanding filters if needed to show change
      persistTransactionsAndRefresh(removed.date);
    } else if (snap.txDate) {
      // Persist to ensure any auto-monthly snapshot recalculates even if exact match not found
      persistTransactionsAndRefresh(snap.txDate);
    } else {
      persistTransactionsAndRefresh();
    }
  }

  if (appState.activeReportId === deletedReport.id) appState.activeReportId = null;
  saveReports();
  renderReportsTable();
  showToast('Laporan berhasil dihapus', 'warning');
}

// Monthly dues management
function loadResidents(): Array<{ id: string | number; nama: string; status?: string }> {
  try { 
    // First try to get real warga data from warga.astro
    const wargaData = JSON.parse(localStorage.getItem('warga_data_v1') || '[]') as any[];
    if (Array.isArray(wargaData) && wargaData.length > 0) {
      return wargaData
        .filter(resident => resident.status === 'aktif')
        .map(resident => ({
          id: resident.id,
          nama: resident.nama || resident.name || `Warga ${resident.id}`,
          status: resident.status
        }));
    }
    
    // Fallback to old residents_data key
    const residentsData = JSON.parse(localStorage.getItem('residents_data') || '[]') as any[];
    if (Array.isArray(residentsData) && residentsData.length > 0) {
      return residentsData.filter(resident => resident.status === 'aktif');
    }
    
    return [];
  } catch { return [] }
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

// Real-time month tracking and navigation
let currentRealTimeMonth = getCurrentMonth();

// Update real-time month every minute
function updateRealTimeMonth() {
  const newMonth = getCurrentMonth();
  if (newMonth !== currentRealTimeMonth) {
    currentRealTimeMonth = newMonth;
    console.log(`[Real-time] Month updated to: ${currentRealTimeMonth}`);
    
    // Update month input if it's set to the old month
    const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
    if (monthInput && monthInput.value === getCurrentMonth()) {
      monthInput.value = currentRealTimeMonth;
    }
    
    // Refresh dues section to reflect new current month
    renderDuesSection();
    
    // Show notification about month change
    showToast(`Bulan berubah ke ${formatMonthYear(currentRealTimeMonth)}`, 'info');
  }
}

// Format month-year for display
function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Navigate to previous month
function navigateToPreviousMonth() {
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  if (!monthInput) return;
  
  const currentValue = monthInput.value || getCurrentMonth();
  const [year, month] = currentValue.split('-').map(Number);
  
  let newMonth = month - 1;
  let newYear = year;
  
  if (newMonth < 1) {
    newMonth = 12;
    newYear = year - 1;
  }
  
  const newValue = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  monthInput.value = newValue;
  
  // Update navigation buttons state
  updateMonthNavigationButtons();
  
  // Refresh dues section
  renderDuesSection();
}

// Navigate to next month
function navigateToNextMonth() {
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  if (!monthInput) return;
  
  const currentValue = monthInput.value || getCurrentMonth();
  const [year, month] = currentValue.split('-').map(Number);
  
  let newMonth = month + 1;
  let newYear = year;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear = year + 1;
  }
  
  const newValue = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  monthInput.value = newValue;
  
  // Update navigation buttons state
  updateMonthNavigationButtons();
  
  // Refresh dues section
  renderDuesSection();
}

// Update navigation buttons state based on current month
function updateMonthNavigationButtons() {
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  const prevBtn = document.querySelector('.prev-month') as HTMLButtonElement | null;
  const nextBtn = document.querySelector('.next-month') as HTMLButtonElement | null;
  
  if (!monthInput || !prevBtn || !nextBtn) return;
  
  const currentValue = monthInput.value || getCurrentMonth();
  const currentMonth = getCurrentMonth();
  
  // Disable previous button if we're at the earliest allowed month (1 year back)
  const [year, month] = currentValue.split('-').map(Number);
  const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
  
  const oneYearAgo = new Date(currentYear, currentMonthNum - 1);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const earliestAllowed = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}`;
  
  prevBtn.disabled = currentValue <= earliestAllowed;
  
  // Disable next button if we're at current month (can't go to future)
  nextBtn.disabled = currentValue >= currentMonth;
}

// Enhanced current month validation with real-time check
function isCurrentMonthRealTime(ym: string): boolean {
  return String(ym).slice(0,7) === currentRealTimeMonth;
}

// Check if month is current or in the future (real-time)
function isCurrentOrFutureMonthRealTime(ym: string): boolean {
  const [cy, cm] = currentRealTimeMonth.split('-').map(Number);
  const [y, m] = String(ym).slice(0,7).split('-').map(Number);
  return (y > cy) || (y === cy && m >= cm);
}

// Format YYYY-MM to "MMMM YYYY" (id-ID)
function formatMonthID(ym: string){
  const [y,m] = String(ym).slice(0,7).split('-').map(Number);
  const d = new Date(y, (m-1), 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Mark dues month as closed and notify dashboards
function closeDuesMonth(ym: string){
  const map = getDuesConfigs();
  if (!map[ym]) return;
  if (!map[ym].closed){ map[ym].closed = true; setDuesConfigs(map); }
  try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
}

// Small centered modal utility for nice warnings
function showCenterModal(title: string, message: string, type: 'info'|'success'|'warning'|'error' = 'warning'){
  const existing = document.getElementById('center-modal-backdrop');
  if (existing) existing.remove();
  const backdrop = document.createElement('div');
  backdrop.id = 'center-modal-backdrop';
  backdrop.style.position = 'fixed';
  backdrop.style.inset = '0';
  backdrop.style.background = 'rgba(15,23,42,0.5)';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.style.width = 'min(460px, 92vw)';
  modal.style.background = 'var(--surface, #ffffff)';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 20px 40px rgba(2,6,23,0.25)';
  modal.style.border = '1px solid rgba(148,163,184,0.25)';
  modal.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '12px';
  header.style.padding = '16px 20px';
  header.style.background = 'linear-gradient(180deg, rgba(248,250,252,0.9), rgba(248,250,252,0.6))';
  const icon = document.createElement('span');
  icon.className = 'fas ' + (type === 'error' ? 'fa-times-circle' : type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-triangle');
  icon.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : type === 'info' ? '#0ea5e9' : '#f59e0b';
  icon.style.fontSize = '20px';
  const h = document.createElement('div');
  h.textContent = title || 'Pemberitahuan';
  h.style.fontWeight = '700';
  h.style.fontSize = '16px';
  header.appendChild(icon); header.appendChild(h);

  const body = document.createElement('div');
  body.style.padding = '16px 20px 4px 20px';
  const p = document.createElement('div');
  p.style.color = 'var(--text-secondary, #475569)';
  p.style.lineHeight = '1.6';
  p.innerHTML = message;
  body.appendChild(p);

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = '10px';
  footer.style.padding = '14px 20px 18px 20px';
  const ok = document.createElement('button');
  ok.textContent = 'Mengerti';
  ok.className = 'action-btn';
  ok.style.background = 'var(--primary-50, #eff6ff)';
  ok.style.color = 'var(--primary-700, #1d4ed8)';
  ok.style.border = '1px solid var(--primary-200, #bfdbfe)';
  ok.style.borderRadius = '10px';
  ok.style.padding = '10px 14px';
  ok.addEventListener('click', () => backdrop.remove());
  footer.appendChild(ok);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

async function renderDuesSection() {
  // Ensure inputs have defaults
  const amountInput = document.getElementById('iuran-amount') as HTMLInputElement | null;
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  if (monthInput && !monthInput.value) monthInput.value = getCurrentMonth();

  const komplekId = resolveKomplekId();
  const periode = (monthInput?.value || getCurrentMonth()).slice(0,7);
  // Reflect saved amount for selected month
  if (amountInput) amountInput.value = String(getDuesAmountFor(periode) || amountInput.value || '');

  // If demo mode flagged, skip API and use local renderer
  try { if (localStorage.getItem('iuran_demo') === '1') { renderDuesSectionFromLocal(); return; } } catch {}

  // Inject "edit iuran" button if config exists
  const editBtnId = 'iuran-edit-btn';
  if (amountInput) {
    const existingBtn = document.getElementById(editBtnId);
    if (iuranExistsFor(periode)) {
      if (!existingBtn) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.marginTop = '8px';

        const btn = document.createElement('button');
        btn.id = editBtnId;
        btn.type = 'button';
        btn.className = 'btn-edit-iuran';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.padding = '6px 10px';
        btn.style.border = '1px solid #e5e7eb';
        btn.style.borderRadius = '8px';
        btn.style.background = '#f9fafb';
        btn.style.color = '#111827';
        btn.innerHTML = '<i class="fas fa-pen"></i> <span>Simpan Perubahan Iuran</span>';
        wrapper.appendChild(btn);
        const group = amountInput.closest('.input-group');
        if (group) group.insertAdjacentElement('afterend', wrapper); else amountInput.insertAdjacentElement('afterend', wrapper);
        btn.addEventListener('click', async ()=>{
          const newAmount = Number((document.getElementById('iuran-amount') as HTMLInputElement | null)?.value || '0');
          if (isNaN(newAmount) || newAmount <= 0) { showToast('Nominal iuran tidak valid', 'error'); return; }
          try {
            // Use the new updateNominal API method
            const success = await iuranManager.updateNominal(newAmount, periode);
            if (success) {
              showToast('Nominal iuran berhasil diperbarui', 'success');
              await renderDuesSection();
              
              // Dispatch custom event for real-time dashboard update
              window.dispatchEvent(new CustomEvent('iuran-nominal-changed', {
                detail: { month: periode, amount: newAmount, action: 'update' }
              }));
            } else {
              showToast('Gagal memperbarui nominal iuran', 'error');
            }
          } catch (e:any) {
            console.error(e);
            if (String(e?.message || '').includes('HTTP 401')) {
              localStorage.setItem('iuran_demo', '1');
              showToast('Mode demo: nominal iuran diubah secara lokal.', 'success');
              updateDuesConfigAmount(periode, newAmount);
              updateIuranTransactionsAmount(periode, newAmount);
              persistTransactionsAndRefresh(`${periode}-01`);
              
              // Dispatch custom event for real-time dashboard update
              window.dispatchEvent(new CustomEvent('iuran-nominal-changed', {
                detail: { month: periode, amount: newAmount, action: 'update-demo' }
              }));
              await renderDuesSection();
            } else {
              showToast('Gagal memperbarui iuran. Coba lagi.', 'error');
            }
          }
        });
      }
    } else if (existingBtn) {
      existingBtn.remove();
    }
  }

  // Add prev/next month navigation buttons if not present
  const prevBtnId = 'iuran-prev';
  const nextBtnId = 'iuran-next';
  if (!document.getElementById(prevBtnId) && monthInput && monthInput.parentElement){
    const wrap = monthInput.parentElement;
    const prevBtn = document.createElement('button'); prevBtn.id = prevBtnId; prevBtn.type='button'; prevBtn.className='btn-month'; prevBtn.innerHTML='<i class="fas fa-chevron-left" aria-hidden="true"></i>'; prevBtn.title='Bulan sebelumnya'; prevBtn.setAttribute('aria-label','Bulan sebelumnya');
    const nextBtn = document.createElement('button'); nextBtn.id = nextBtnId; nextBtn.type='button'; nextBtn.className='btn-month'; nextBtn.innerHTML='<i class="fas fa-chevron-right" aria-hidden="true"></i>'; nextBtn.title='Bulan berikutnya'; nextBtn.setAttribute('aria-label','Bulan berikutnya');
    wrap.insertBefore(prevBtn, monthInput);
    wrap.insertBefore(nextBtn, monthInput.nextSibling);
    prevBtn.addEventListener('click', ()=>{ if (!monthInput) return; monthInput.value = shiftMonth((monthInput.value||getCurrentMonth()).slice(0,7), -1); renderDuesSectionFromLocal(); });
    nextBtn.addEventListener('click', ()=>{ if (!monthInput) return; monthInput.value = shiftMonth((monthInput.value||getCurrentMonth()).slice(0,7), +1); renderDuesSectionFromLocal(); });
  }

  const paidContainer = document.getElementById('iuran-paid');
  const pendingContainer = document.getElementById('iuran-pending');
  if (paidContainer) paidContainer.innerHTML = '<div class="loading-state">Memuat...</div>';
  if (pendingContainer) pendingContainer.innerHTML = '<div class="loading-state">Memuat...</div>';

  // Rule: If admin hasn't saved iuran for current/future month, hide resident data
  if (isCurrentOrFutureMonthRealTime(periode) && !getDuesAmountFor(periode)) {
    const msg = `Admin belum menyimpan nominal iuran untuk bulan <strong>${formatMonthID(periode)}</strong>. Data warga disembunyikan hingga iuran disimpan.`;
    if (paidContainer) paidContainer.innerHTML = `<div class="empty-state">${msg}</div>`;
    if (pendingContainer) pendingContainer.innerHTML = `<div class="empty-state">${msg}</div>`;
    return;
  }

  try {
    const data = await fetchJson(`/api/public/iuran/status?komplek_id=${encodeURIComponent(String(komplekId))}&periode=${encodeURIComponent(periode)}`);
    const amount = Number(data?.amount || 0);
    if (amountInput && !amountInput.value) amountInput.value = String(amount || 0);

    const paidResidents = Array.isArray(data?.paid) ? data.paid : [];
    const pendingResidents = Array.isArray(data?.pending) ? data.pending : [];

    if (paidContainer) {
      if (paidResidents.length > 0) {
        paidContainer.innerHTML = paidResidents.map((resident: any) => `
          <div class="status-pill">
            <span class="pill-name">${resident.nama}</span>
            <button class="btn-unpay" data-unpay-resident="${resident.id}" title="Batalkan pembayaran" aria-label="Batalkan pembayaran">
              <i class="fas fa-undo"></i>
              <span>Batalkan</span>
            </button>
          </div>
        `).join('');
        (paidContainer.querySelectorAll('button[data-unpay-resident]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
          if ((btn as any).dataset.bound) return; (btn as any).dataset.bound = '1';
          btn.addEventListener('click', async (ev) => {
            // ripple
            try {
              const r = document.createElement('span');
              r.className = 'ripple';
              const rect = btn.getBoundingClientRect();
              const x = (ev as MouseEvent).clientX - rect.left; const y = (ev as MouseEvent).clientY - rect.top;
              r.style.left = x + 'px'; r.style.top = y + 'px';
              btn.appendChild(r); setTimeout(()=> r.remove(), 500);
            } catch {}
            // loading state
            if (!btn.disabled){
              btn.disabled = true;
              (btn as any).dataset.prev = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses...</span>';
            }
            const wargaId = btn.getAttribute('data-unpay-resident') || '';
            await markIuranPayment(wargaId, false);
            // UI will rerender on success; restore as fallback if not rerendered
            setTimeout(()=>{
              if (document.body.contains(btn)){
                btn.disabled = false;
                if ((btn as any).dataset.prev) btn.innerHTML = (btn as any).dataset.prev;
              }
            }, 1200);
          });
        });
      } else {
        paidContainer.innerHTML = '<div class="loading-state">Belum ada pembayaran bulan ini</div>';
      }
    }

    if (pendingContainer) {
      if (pendingResidents.length > 0) {
        pendingContainer.innerHTML = pendingResidents.map((resident: any) => `
          <div class="status-pill">
            <span class="pill-name">${resident.nama}</span>
            <button class="btn-pay" data-pay-resident="${resident.id}" title="Tandai sudah bayar" aria-label="Tandai sudah bayar">
              <i class="fas fa-check"></i>
              <span>Tandai Bayar</span>
            </button>
          </div>
        `).join('');
        (pendingContainer.querySelectorAll('button[data-pay-resident]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
          if ((btn as any).dataset.bound) return; (btn as any).dataset.bound = '1';
          btn.addEventListener('click', async (ev) => {
            // ripple
            try {
              const r = document.createElement('span'); r.className = 'ripple';
              const rect = btn.getBoundingClientRect();
              const x = (ev as MouseEvent).clientX - rect.left; const y = (ev as MouseEvent).clientY - rect.top;
              r.style.left = x + 'px'; r.style.top = y + 'px';
              btn.appendChild(r); setTimeout(()=> r.remove(), 500);
            } catch {}
            // loading state
            if (!btn.disabled){
              btn.disabled = true;
              (btn as any).dataset.prev = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses...</span>';
            }
            const wargaId = btn.getAttribute('data-pay-resident') || '';
            await markIuranPayment(wargaId, true);
            setTimeout(()=>{
              if (document.body.contains(btn)){
                btn.disabled = false;
                if ((btn as any).dataset.prev) btn.innerHTML = (btn as any).dataset.prev;
              }
            }, 1200);
          });
        });
      } else {
        // All paid: close month, show success modal once, and show friendly message
        if (!isDuesClosed(periode)) { closeDuesMonth(periode); }
        const notifKey = `iuran_closed_notif_${periode}`;
        if (!localStorage.getItem(notifKey)){
          localStorage.setItem(notifKey, String(Date.now()));
          showCenterModal('Iuran Lunas', `Iuran bulan <strong>${formatMonthID(periode)}</strong> telah <strong>lunas</strong> untuk semua warga.`, 'success');
        }
        // Clear lists to indicate completion
        if (paidContainer) paidContainer.innerHTML = '<div class="loading-state">Semua pembayaran bulan ini tercatat</div>';
        pendingContainer.innerHTML = '<div class="loading-state">Semua warga sudah membayar</div>';
      }
    }

  } catch (error:any) {
    // Any HTTP error => enter demo/local mode to avoid 404/500 spam
    try { localStorage.setItem('iuran_demo', '1') } catch {}
    console.warn('Iuran API unavailable, switching to local mode.', error?.message || error);
    renderDuesSectionFromLocal();
    return;
  }

  // Bind Save button once
  const saveBtn = document.getElementById('iuran-save') as HTMLButtonElement | null;
  if (saveBtn && !(saveBtn as any).dataset.bound) {
    (saveBtn as any).dataset.bound = '1';
    saveBtn.addEventListener('click', async () => {
      const amountVal = Number((document.getElementById('iuran-amount') as HTMLInputElement | null)?.value || '0');
      const monthVal = (document.getElementById('iuran-month') as HTMLInputElement | null)?.value || getCurrentMonth();
      const targetMonth = String(monthVal).slice(0,7);
      if (!isCurrentMonthRealTime(targetMonth)){
        showCenterModal('Iuran hanya untuk bulan ini', `Maaf, pembuatan iuran dibatasi <strong>hanya untuk bulan berjalan</strong>.<br/>Bulan yang dipilih: <strong>${targetMonth}</strong><br/>Silakan set kembali ke <strong>${currentRealTimeMonth}</strong>.`, 'warning');
        return;
      }
      try{
        await postJson('/api/iuran/generate', {
          komplek_id: Number(komplekId),
          periode: targetMonth,
          amount: Number(isNaN(amountVal) ? 0 : amountVal)
        });
        showToast('Iuran periode berhasil disimpan', 'success');
        await renderDuesSection();
      }catch(e:any){
        console.error(e);
        if (String(e?.message || '').includes('HTTP 401')) {
          // Demo fallback: store locally
          // Validate again in demo mode
          if (!isCurrentMonthRealTime(targetMonth)){
            showCenterModal('Iuran hanya untuk bulan ini', `Maaf, pembuatan iuran dibatasi <strong>hanya untuk bulan berjalan</strong>.<br/>Bulan yang dipilih: <strong>${targetMonth}</strong><br/>Silakan set kembali ke <strong>${currentRealTimeMonth}</strong>.`, 'warning');
            return;
          }
          const existing = getDuesAmountFor(targetMonth);
          if (existing && existing > 0){
            showToast(`Iuran bulan ${targetMonth} sudah ada: ${formatIDR(existing)}. Gunakan fitur edit untuk mengubah nominal.`, 'warning');
            return;
          }
          saveDuesConfig({ amount: Number(isNaN(amountVal) ? 0 : amountVal), month: targetMonth });
          localStorage.setItem('iuran_demo', '1');
          showToast('Mode demo: iuran disimpan lokal', 'success');
          await renderDuesSectionFromLocal();
          
          // Dispatch custom event for real-time dashboard update
          window.dispatchEvent(new CustomEvent('iuran-updated', {
            detail: { month: targetMonth, amount: Number(isNaN(amountVal) ? 0 : amountVal), action: 'save-demo' }
          }));
        } else {
          showToast('Gagal menyimpan iuran. Coba lagi.', 'error');
        }
      }
    });
  }
}

function getDuesConfig(): { amount?: number; month?: string } {
  try { return JSON.parse(localStorage.getItem('dues_config') || '{}') } catch { return {} }
}
function saveDuesConfig(config: { amount?: number; month?: string }): boolean {
  // Back-compat: also keep last saved in 'dues_config'
  try { localStorage.setItem('dues_config', JSON.stringify(config)) } catch (error) { console.warn('Could not save dues config:', error) }
  // New: maintain per-month configs in 'dues_configs'
  try {
    const month = String(config.month || getCurrentMonth()).slice(0,7);
    const amount = Number(config.amount || 0);
    const all = getDuesConfigs();
    if (all[month] && all[month].amount > 0) {
      // Duplicate month with non-zero amount: warn and do not overwrite
      showToast(`Iuran bulan ${month} sudah ada: Rp ${formatIDR(all[month].amount)}. Gunakan fitur edit untuk mengubah nominal.`, 'warning');
      return false;
    }
    all[month] = { amount, closed: false, createdAt: Date.now() } as any;
    setDuesConfigs(all);
    // Notify other tabs (dashboard) to recompute pending
    try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
    
    // Dispatch custom event for real-time dashboard update
    window.dispatchEvent(new CustomEvent('iuran-updated', {
      detail: { month, amount, action: 'save' }
    }));
    
    return true;
  } catch (error) { console.warn('Could not save per-month dues config:', error); return false }
}
function getDuesPayments(): Record<string, { paid: string[] }> {
  try { return JSON.parse(localStorage.getItem('dues_payments') || '{}') } catch { return {} as any }
}

// New helpers for per-month dues config
function getDuesConfigs(): Record<string, { amount: number; closed?: boolean; createdAt?: number }>{
  try { return JSON.parse(localStorage.getItem('dues_configs') || '{}') } catch { return {} }
}
function setDuesConfigs(cfg: Record<string, { amount: number; closed?: boolean; createdAt?: number }>){
  try { localStorage.setItem('dues_configs', JSON.stringify(cfg)) } catch {}
}
function getDuesAmountFor(month: string): number{
  const map = getDuesConfigs();
  if (map[month]) return Number(map[month].amount||0);
  try { const legacy = JSON.parse(localStorage.getItem('dues_config')||'{}'); return String(legacy?.month||'').slice(0,7)===month ? Number(legacy?.amount||0) : 0 } catch { return 0 }
}
function iuranExistsFor(month: string): boolean{
  const map = getDuesConfigs();
  if (map[month]) return true;
  try { const legacy = JSON.parse(localStorage.getItem('dues_config')||'{}'); return String(legacy?.month||'').slice(0,7)===month } catch { return false }
}
function isDuesClosed(month: string): boolean{
  const map = getDuesConfigs();
  return !!map[month]?.closed;
}

// Update per-month dues amount and keep legacy key in sync when applicable
function updateDuesConfigAmount(ym: string, amount: number){
  const all = getDuesConfigs();
  if (!all[ym]) all[ym] = { amount, closed: false, createdAt: Date.now() } as any;
  else all[ym].amount = amount;
  setDuesConfigs(all);
  try {
    const legacy = JSON.parse(localStorage.getItem('dues_config') || '{}');
    if (String(legacy?.month || '').slice(0,7) === ym) {
      legacy.amount = amount; localStorage.setItem('dues_config', JSON.stringify(legacy));
    }
  } catch {}
  try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
}

// Adjust amount of existing linked iuran transactions for a given month
function updateIuranTransactionsAmount(ym: string, newAmount: number){
  if (newAmount <= 0) return;
  const prefix = makeIuranToken(ym, ''); // yields like [IURAN:YYYY-MM:]
  appState.transactions.forEach(t => {
    if (t.type === 'Masuk' && t.category === 'Iuran' && typeof t.description === 'string' && t.description.includes(`[IURAN:${ym}:`)) {
      t.amount = newAmount;
    }
  });
  // keep sorted
  appState.transactions.sort((a,b)=> a.date.localeCompare(b.date));
}

// Allow month navigation in the iuran section
function shiftMonth(ym: string, delta: number): string{
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, (m-1)+delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function saveDuesPayments(payments: Record<string, { paid: string[] }>) {
  try { localStorage.setItem('dues_payments', JSON.stringify(payments)) } catch (error) { console.warn('Could not save dues payments:', error) }
}
async function markIuranPayment(residentId: string | number, paid: boolean) {
  const monthVal = (document.getElementById('iuran-month') as HTMLInputElement | null)?.value || getCurrentMonth();
  const amountVal = Number((document.getElementById('iuran-amount') as HTMLInputElement | null)?.value || '0');
  // Guard: admin must save iuran for this month before confirming payments
  const periode = String(monthVal).slice(0,7);
  if (!getDuesAmountFor(periode)) {
    showCenterModal(
      'Belum Menyimpan Iuran',
      `Admin belum menyimpan nominal iuran untuk bulan <strong>${formatMonthID(periode)}</strong>. Simpan iuran terlebih dahulu agar penagihan dapat berjalan dan status pembayaran bisa ditandai.`,
      'warning'
    );
    return;
  }
  const komplekId = resolveKomplekId();
  try{
    await postJson('/api/iuran/mark', {
      komplek_id: Number(komplekId),
      periode: String(monthVal).slice(0,7),
      warga_id: Number(residentId),
      paid: !!paid,
      amount: Number(isNaN(amountVal) ? 0 : amountVal)
    });
    showToast(paid ? 'Pembayaran ditandai lunas' : 'Pembayaran dibatalkan', 'success');
    await renderDuesSection();
    // Sync ledger: add/remove the linked Iuran transaction
    try {
      syncIuranLedgerTransaction({ periode, residentId: String(residentId), amount: amountVal, paid });
    } catch (err) { console.warn('Failed syncing ledger after API success:', err); }
  }catch(e:any){
    console.error(e);
    if (String(e?.message || '').includes('HTTP 401')) {
      // Demo fallback: mutate local payments
      toggleLocalPayment(String(monthVal).slice(0,7), String(residentId), !!paid);
      localStorage.setItem('iuran_demo', '1');
      showToast(`Mode demo: pembayaran ${paid ? 'ditandai' : 'dibatalkan'} secara lokal.`, 'success');
      try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
      renderDuesSectionFromLocal();
      // Also update local ledger so KPIs reflect immediately
      try {
        syncIuranLedgerTransaction({ periode, residentId: String(residentId), amount: amountVal, paid });
      } catch (err) { console.warn('Failed syncing ledger in demo:', err); }
    } else {
      showToast('Gagal mengubah status pembayaran. Coba lagi.', 'error');
    }
  }
}

// ===== Helpers to link Iuran payments with ledger transactions =====
function getResidentNameById(id: string): string {
  try {
    // First try to get real warga data from warga.astro
    const wargaData = JSON.parse(localStorage.getItem('warga_data_v1') || '[]') as Array<{id:any; nama?:string; name?:string}>;
    if (Array.isArray(wargaData) && wargaData.length > 0) {
      const found = wargaData.find(r => String(r.id) === String(id));
      if (found) return (found.nama || found.name || `Warga ${id}`);
    }
    
    // Fallback to old residents_data key
    const residentsData = JSON.parse(localStorage.getItem('residents_data') || '[]') as Array<{id:any; nama?:string; name?:string}>;
    const found = Array.isArray(residentsData) ? residentsData.find(r => String(r.id) === String(id)) : null;
    return (found?.nama || (found as any)?.name || `Warga ${id}`);
  } catch { return `Warga ${id}` }
}

function makeIuranToken(periode: string, residentId: string): string {
  return `[IURAN:${periode}:${residentId}]`;
}

function buildIuranDescription(periode: string, residentId: string): string {
  const name = getResidentNameById(residentId);
  return `Iuran Bulanan ${periode} - ${name} ${makeIuranToken(periode, residentId)}`;
}

function findIuranTxIndex(periode: string, residentId: string): number {
  const token = makeIuranToken(periode, residentId);
  return appState.transactions.findIndex(t => t.type === 'Masuk' && t.category === 'Iuran' && t.description?.includes(token));
}

function addIuranTransaction(periode: string, residentId: string, amount: number){
  if (amount <= 0) return;
  const exists = findIuranTxIndex(periode, residentId);
  if (exists >= 0) return; // avoid duplicate
  const date = `${periode}-01`;
  const description = buildIuranDescription(periode, residentId);
  appState.transactions.push({ date, type: 'Masuk', category: 'Iuran', description, amount });
}

function removeIuranTransaction(periode: string, residentId: string){
  const idx = findIuranTxIndex(periode, residentId);
  if (idx >= 0) appState.transactions.splice(idx, 1);
}

function persistTransactionsAndRefresh(dateInvolved?: string, opts?: { suppressAutoMonthly?: boolean }){
  try { localStorage.setItem('financial_transactions_v2', JSON.stringify(appState.transactions)) } catch {}
  // Expand filter range if needed so the change is visible
  if (dateInvolved) {
    if (!appState.filters.start || dateInvolved < appState.filters.start) appState.filters.start = dateInvolved;
    if (!appState.filters.end || dateInvolved > appState.filters.end) appState.filters.end = dateInvolved;
    appState.filters.preset = 'custom';
    // Keep monthly Report History in sync automatically
    if (!opts || !opts.suppressAutoMonthly) upsertAutoMonthlyReport(dateInvolved);
  }
  refreshDashboard();
  try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
}

function syncIuranLedgerTransaction(opts: { periode: string; residentId: string; amount: number; paid: boolean }){
  const { periode, residentId, amount, paid } = opts;
  const date = `${periode}-01`;
  if (paid) addIuranTransaction(periode, residentId, amount); else removeIuranTransaction(periode, residentId);
  // Keep transactions sorted by date ascending to maintain consistency
  appState.transactions.sort((a, b) => a.date.localeCompare(b.date));
  persistTransactionsAndRefresh(date);
}

// ===== Demo-mode helpers (localStorage) =====
function getPeriodKey(monthVal?: string){
  const m = monthVal || (document.getElementById('iuran-month') as HTMLInputElement | null)?.value || getCurrentMonth();
  return String(m).slice(0,7);
}

function getLocalPayments(): Record<string, { paid: string[] }>{
  try { return JSON.parse(localStorage.getItem('dues_payments') || '{}') } catch { return {} }
}
function setLocalPayments(p: Record<string, { paid: string[] }>){
  try { localStorage.setItem('dues_payments', JSON.stringify(p)) } catch {}
}
function toggleLocalPayment(periode: string, residentId: string, paid: boolean){
  const payments = getLocalPayments();
  if(!payments[periode]) payments[periode] = { paid: [] };
  const set = new Set(payments[periode].paid || []);
  if(paid) set.add(residentId); else set.delete(residentId);
  payments[periode].paid = Array.from(set);
  setLocalPayments(payments);
}

function renderDuesSectionFromLocal(){
  const amountInput = document.getElementById('iuran-amount') as HTMLInputElement | null;
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  if (monthInput && !monthInput.value) monthInput.value = getCurrentMonth();
  const periode = getPeriodKey();
  const cfg = getDuesConfig();
  // Prefer per-month saved amount; fallback to legacy last config
  if (amountInput && !amountInput.value) {
    const perMonth = getDuesAmountFor(periode);
    amountInput.value = String(perMonth || cfg.amount || 0);
  }

  // Inject "edit iuran" button if config exists in local mode as well
  const editBtnId = 'iuran-edit-btn';
  if (amountInput) {
    const existingBtn = document.getElementById(editBtnId);
    if (iuranExistsFor(periode)) {
      if (!existingBtn) {
        const btn = document.createElement('button');
        btn.id = editBtnId;
        btn.type = 'button';
        btn.className = 'btn-edit-iuran';
        // Place below input to avoid collision with suffix "/bulan"
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.marginTop = '8px';
        btn.style.marginLeft = '0';
        btn.style.padding = '6px 10px';
        btn.style.border = '1px solid #e5e7eb';
        btn.style.borderRadius = '8px';
        btn.style.background = '#f9fafb';
        btn.style.color = '#111827';
        btn.innerHTML = '<i class="fas fa-pen"></i> <span>Simpan Perubahan Iuran</span>';
        const group = amountInput.closest('.input-group');
        if (group) group.appendChild(btn); else amountInput.insertAdjacentElement('afterend', btn);
        btn.addEventListener('click', ()=>{
          const newAmount = Number((document.getElementById('iuran-amount') as HTMLInputElement | null)?.value || '0');
          if (isNaN(newAmount) || newAmount <= 0) { showToast('Nominal iuran tidak valid', 'error'); return; }
          updateDuesConfigAmount(periode, newAmount);
          updateIuranTransactionsAmount(periode, newAmount);
          persistTransactionsAndRefresh(`${periode}-01`);
          renderDuesSectionFromLocal();
          showToast('Nominal iuran diperbarui (lokal)', 'success');
        });
      }
    } else if (existingBtn) {
      existingBtn.remove();
    }
  }

  // Rule (demo/local): hide residents for current/future month when no iuran saved
  const paidC = document.getElementById('iuran-paid');
  const pendC = document.getElementById('iuran-pending');
  if (isCurrentOrFutureMonthRealTime(periode) && !getDuesAmountFor(periode)) {
    const msg = `Admin belum menyimpan nominal iuran untuk bulan <strong>${formatMonthID(periode)}</strong>. Data warga disembunyikan hingga iuran disimpan.`;
    if (paidC) paidC.innerHTML = `<div class="empty-state">${msg}</div>`;
    if (pendC) pendC.innerHTML = `<div class="empty-state">${msg}</div>`;
    return;
  }

  // Ensure demo residents exist so lists can render
  ensureDemoResidents();
  const residents = loadResidents();
  const payments = getLocalPayments();
  const paidSet = new Set((payments[periode]?.paid || []).map(String));
  const paidResidents = residents.filter(r => paidSet.has(String(r.id)));
  const pendingResidents = residents.filter(r => !paidSet.has(String(r.id)));

  const paidContainer = document.getElementById('iuran-paid');
  const pendingContainer = document.getElementById('iuran-pending');

  if (paidContainer) {
    paidContainer.innerHTML = paidResidents.length ? paidResidents.map(resident => `
      <div class="status-pill">
        <span class="pill-name">${resident.nama}</span>
        <button class="btn-unpay" data-unpay-resident="${resident.id}" title="Batalkan pembayaran" aria-label="Batalkan pembayaran">
          <i class="fas fa-undo"></i>
          <span>Batalkan</span>
        </button>
      </div>
    `).join('') : '<div class="loading-state">Belum ada pembayaran bulan ini</div>';
    (paidContainer.querySelectorAll('button[data-unpay-resident]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
      if ((btn as any).dataset.bound) return; (btn as any).dataset.bound = '1';
      btn.addEventListener('click', (ev) => {
        try {
          const r = document.createElement('span'); r.className = 'ripple';
          const rect = btn.getBoundingClientRect();
          const x = (ev as MouseEvent).clientX - rect.left; const y = (ev as MouseEvent).clientY - rect.top;
          r.style.left = x + 'px'; r.style.top = y + 'px';
          btn.appendChild(r); setTimeout(()=> r.remove(), 500);
        } catch {}
        if (!btn.disabled){
          btn.disabled = true;
          (btn as any).dataset.prev = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses...</span>';
        }
        const wargaId = btn.getAttribute('data-unpay-resident') || '';
        toggleLocalPayment(periode, wargaId, false);
        renderDuesSectionFromLocal();
        setTimeout(()=>{
          if (document.body.contains(btn)){
            btn.disabled = false;
            if ((btn as any).dataset.prev) btn.innerHTML = (btn as any).dataset.prev;
          }
        }, 800);
      });
    });
  }

  if (pendingContainer) {
    if (pendingResidents.length) {
      pendingContainer.innerHTML = pendingResidents.map(resident => `
      <div class="status-pill">
        <span class="pill-name">${resident.nama}</span>
        <button class="btn-pay" data-pay-resident="${resident.id}" title="Tandai sudah bayar" aria-label="Tandai sudah bayar">
          <i class="fas fa-check"></i>
          <span>Tandai Bayar</span>
        </button>
      </div>
    `).join('');
    (pendingContainer.querySelectorAll('button[data-pay-resident]') as NodeListOf<HTMLButtonElement>).forEach(btn => {
      if ((btn as any).dataset.bound) return; (btn as any).dataset.bound = '1';
      btn.addEventListener('click', (ev) => {
        try {
          const r = document.createElement('span'); r.className = 'ripple';
          const rect = btn.getBoundingClientRect();
          const x = (ev as MouseEvent).clientX - rect.left; const y = (ev as MouseEvent).clientY - rect.top;
          r.style.left = x + 'px'; r.style.top = y + 'px';
          btn.appendChild(r); setTimeout(()=> r.remove(), 500);
        } catch {}
        if (!btn.disabled){
          btn.disabled = true;
          (btn as any).dataset.prev = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses...</span>';
        }
        const wargaId = btn.getAttribute('data-pay-resident') || '';
        toggleLocalPayment(periode, wargaId, true);
        renderDuesSectionFromLocal();
        setTimeout(()=>{
          if (document.body.contains(btn)){
            btn.disabled = false;
            if ((btn as any).dataset.prev) btn.innerHTML = (btn as any).dataset.prev;
          }
        }, 800);
      });
    });
    } else {
      // All paid locally: close and notify once
      if (!isDuesClosed(periode)) { closeDuesMonth(periode); }
      const notifKey = `iuran_closed_notif_${periode}`;
      if (!localStorage.getItem(notifKey)){
        localStorage.setItem(notifKey, String(Date.now()));
        showCenterModal('Iuran Lunas', `Iuran bulan <strong>${formatMonthID(periode)}</strong> telah <strong>lunas</strong> untuk semua warga.`, 'success');
      }
      if (paidContainer) paidContainer.innerHTML = '<div class="loading-state">Semua pembayaran bulan ini tercatat</div>';
      // Add repeat/undo controls for convenience
      pendingContainer.innerHTML = `
        <div class="loading-state">Semua warga sudah membayar</div>
        <div class="bulk-actions" style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button id="iuran-reset-all" class="btn-unpay-all" style="padding:6px 10px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; color:#ef4444">
            <i class="fas fa-undo"></i> <span>Ulangi: Set semua jadi belum bayar</span>
          </button>
          <button id="iuran-repay-all" class="btn-repay-all" style="padding:6px 10px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; color:#16a34a">
            <i class="fas fa-redo"></i> <span>Tandai semua sudah bayar lagi</span>
          </button>
        </div>
      `;
      // Bind handlers
      const btnResetAll = document.getElementById('iuran-reset-all') as HTMLButtonElement | null;
      const btnRepayAll = document.getElementById('iuran-repay-all') as HTMLButtonElement | null;
      btnResetAll?.addEventListener('click', async ()=>{
        try{
          const payments = getLocalPayments();
          const currentPaid = Array.from(new Set((payments[periode]?.paid || []).map(String)));
          if (currentPaid.length === 0) { showToast('Tidak ada data pembayaran untuk direset.', 'info'); return; }
          // Remove linked ledger transactions and unpay
          currentPaid.forEach(id => { removeIuranTransaction(periode, id); });
          payments[periode] = { paid: [] };
          setLocalPayments(payments);
          try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
          persistTransactionsAndRefresh(`${periode}-01`);
          renderDuesSectionFromLocal();
          showToast('Semua ditandai belum bayar.', 'warning');
        }catch(e){ console.warn(e); showToast('Gagal mereset. Coba lagi.', 'error'); }
      });
      btnRepayAll?.addEventListener('click', async ()=>{
        try{
          const residents = loadResidents();
          const payments = getLocalPayments();
          const amount = getDuesAmountFor(periode);
          const allIds = residents.map(r => String(r.id));
          // Mark all paid and add ledger transactions (dedupe inside helper)
          allIds.forEach(id => { toggleLocalPayment(periode, id, true); addIuranTransaction(periode, id, amount); });
          try { localStorage.setItem('iuran_dirty', String(Date.now())) } catch {}
          persistTransactionsAndRefresh(`${periode}-01`);
          renderDuesSectionFromLocal();
          showToast('Semua ditandai sudah bayar.', 'success');
        }catch(e){ console.warn(e); showToast('Gagal menandai ulang. Coba lagi.', 'error'); }
      });
    }
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
  // Persist a snapshot so Admin Dashboard can mirror these numbers
  try {
    const snapshot = {
      totals: { income: totals.income, expense: totals.expense, balance: totals.balance },
      period: { start: appState.filters.start, end: appState.filters.end, preset: appState.filters.preset },
      ts: Date.now()
    };
    localStorage.setItem('laporan_totals_snapshot', JSON.stringify(snapshot));
    // Persist compact chart series so Admin Dashboard charts can mirror laporan charts exactly
    const series = generateDailySeries(transactions);
    // Build expense composition map
    const composition: Record<string, number> = {};
    transactions.filter(t => t.type === 'Keluar').forEach(t => {
      composition[t.category] = (composition[t.category] || 0) + t.amount;
    });
    const chartSnapshot = {
      labels: series.labels,
      dates: series.dates,
      dailyIncome: series.dailyIncome,
      dailyExpense: series.dailyExpense,
      cumulativeBalance: series.cumulativeBalance,
      composition,
      ts: Date.now()
    };
    localStorage.setItem('laporan_chart_series', JSON.stringify(chartSnapshot));
  } catch {}
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
  // One-time demo mode info modal on first visit to laporan page
  try {
    const demoKey = 'laporan_demo_notif_shown';
    if (!localStorage.getItem(demoKey)) {
      localStorage.setItem(demoKey, String(Date.now()));
      showCenterModal('Informasi', 'Mode demo: menampilkan data lokal.', 'info');
    }
  } catch {}
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

  // "Buat Laporan" opens the report form (drawer)
  document.getElementById('btn-open-drawer')?.addEventListener('click', openDrawer);
  // Optional: if you add a separate button with id="btn-quick-snapshot", it will save a snapshot directly
  document.getElementById('btn-quick-snapshot')?.addEventListener('click', () => saveCurrentAsReport());
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer);

  const reportForm = document.getElementById('form-report') as HTMLFormElement | null;
  // Bind as Report creation form unconditionally
  if (reportForm) {
    reportForm.addEventListener('submit', handleReportSubmit);
  }

  // Transaction form submit
  const txForm = document.getElementById('form-transaction') as HTMLFormElement | null;
  if (txForm) txForm.addEventListener('submit', handleTransactionSubmit);

  document.getElementById('btn-add-adj')?.addEventListener('click', () => { addAdjustmentRow() });

  // Initialize transaction date default and weekday label (if transaction form is active)
  const txDate = document.getElementById('tx-date') as HTMLInputElement | null;
  const txWeekday = document.getElementById('tx-date-weekday') as HTMLElement | null;
  if (txDate) {
    if (!txDate.value) txDate.value = new Date().toISOString().slice(0,10);
    const updateWeekday = () => {
      if (!txWeekday) return;
      const v = txDate.value;
      if (!v) { txWeekday.textContent = ''; return }
      const d = new Date(v + 'T00:00:00');
      const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      txWeekday.textContent = days[d.getDay()] || '';
    };
    updateWeekday();
    txDate.addEventListener('input', updateWeekday);
  }

  ['rep-start', 'rep-end'].forEach(id => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.addEventListener('change', updateReportPreview);
  });

  const saveBtn = document.getElementById('iuran-save');
  saveBtn?.addEventListener('click', () => {
    const amountInput = document.getElementById('iuran-amount') as HTMLInputElement | null;
    const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
    const amount = Number(amountInput?.value || 0);
    const month = monthInput?.value || '';
    const ym = month.slice(0,7);
    if (!isCurrentMonthRealTime(ym)){
      showCenterModal('Iuran hanya untuk bulan ini', `Maaf, pengaturan iuran dibatasi <strong>hanya untuk bulan berjalan</strong>.<br/>Bulan yang dipilih: <strong>${ym}</strong><br/>Silakan set kembali ke <strong>${currentRealTimeMonth}</strong>.`, 'warning');
      return;
    }
    const ok = saveDuesConfig({ amount, month: ym });
    if (ok) {
      showToast('Pengaturan iuran berhasil disimpan', 'success');
    }
  });

  const calBtn = document.querySelector('.calendar-btn') as HTMLButtonElement | null;
  const monthField = document.getElementById('iuran-month') as HTMLInputElement | null;
  calBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!monthField) return;
    // Prefer showPicker when supported
    const anyInput = monthField as any;
    if (typeof anyInput.showPicker === 'function') {
      anyInput.showPicker();
      return;
    }
    // Fallbacks
    monthField.focus();
    monthField.click();
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() });
}

// ===== Export Modal & Logic (for laporan) =====
// Elements
const exportModal = document.getElementById('export-modal');
const btnExport = document.getElementById('btn-export');
const btnCloseExport = document.getElementById('btn-close-export');
const btnCancelExport = document.getElementById('btn-cancel-export');
const btnDoExport = document.getElementById('btn-do-export');
const splitSelect = document.getElementById('export-split') as HTMLSelectElement | null;
const exportSummary = document.getElementById('export-summary');
let exportFormat: 'xlsx' | 'pdf' | 'doc' = 'xlsx';
let exportOriginalParent: Node | null = null; let exportOriginalNext: ChildNode | null = null;

function openExport(){
  if(!exportModal) return;
  // Portal to body for proper overlay
  if(exportModal.parentElement !== document.body){
    exportOriginalParent = exportModal.parentElement;
    exportOriginalNext = exportModal.nextSibling;
    document.body.appendChild(exportModal);
  }
  exportModal.classList.remove('hiding');
  exportModal.classList.add('show');
  exportModal.setAttribute('aria-hidden','false');
  // Update summary with current filtered count
  const rows = getFilteredTransactions();
  if (exportSummary) exportSummary.textContent = `Akan mengekspor ${rows.length} baris sesuai filter saat ini.`;
}

function closeExport(){
  if(!exportModal) return;
  exportModal.classList.add('hiding');
  exportModal.setAttribute('aria-hidden','true');
  const D = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
  setTimeout(()=>{
    exportModal.classList.remove('show','hiding');
    if(exportOriginalParent){
      if(exportOriginalNext){ (exportOriginalParent as Node).insertBefore(exportModal, exportOriginalNext); }
      else { (exportOriginalParent as Node).appendChild(exportModal); }
    }
  }, D);
}

btnExport?.addEventListener('click', openExport);
btnCloseExport?.addEventListener('click', closeExport);
btnCancelExport?.addEventListener('click', closeExport);
exportModal?.querySelector('[data-close]')?.addEventListener('click', closeExport as any);

// Format chips
exportModal?.querySelectorAll('.chip-group .chip')?.forEach(ch=>{
  ch.addEventListener('click', ()=>{
    exportModal.querySelectorAll('.chip-group .chip').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    ch.classList.add('active'); ch.setAttribute('aria-selected','true');
    exportFormat = (ch as HTMLElement).dataset.format as any || 'xlsx';
  });
});

// Helpers for export
function groupRowsLaporan(rows: Transaction[], mode: string){
  if(mode==='type'){
    return [
      { name:'Masuk', rows: rows.filter(r=>r.type==='Masuk') },
      { name:'Keluar', rows: rows.filter(r=>r.type==='Keluar') },
    ].filter(g=>g.rows.length);
  }
  if(mode==='category'){
    const byCat: Record<string, Transaction[]> = {};
    rows.forEach(r=>{ (byCat[r.category]||(byCat[r.category]=[])).push(r) });
    return Object.keys(byCat).sort().map(k=> ({name:k, rows:byCat[k]}));
  }
  return [{ name:'Semua Transaksi', rows }];
}

function rowsToAoALaporan(rows: Transaction[]){
  const header = ['Tanggal','Keterangan','Kategori','Tipe','Jumlah'];
  const body = rows.map(r=> [r.date, (r.description||''), r.category, r.type, r.amount]);
  return [header, ...body];
}

function downloadBlob(blob: Blob, filename: string){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}

async function ensureSheetJS(){
  if((window as any).XLSX) return;
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
}

async function ensureJsPDF(){
  const w = window as any;
  if(w.jspdf && w.jspdf.jsPDF && w.jspdf.autoTable) return;
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
}

async function exportXLSX(groups: Array<{name:string; rows: Transaction[]}>){
  await ensureSheetJS();
  const XLSX = (window as any).XLSX;
  const wb = XLSX.utils.book_new();
  groups.forEach(g=>{
    const ws = XLSX.utils.aoa_to_sheet(rowsToAoALaporan(g.rows));
    XLSX.utils.book_append_sheet(wb, ws, g.name.substring(0,31));
  });
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  downloadBlob(new Blob([wbout], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), 'laporan.xlsx');
}

async function exportPDF(groups: Array<{name:string; rows: Transaction[]}>){
  await ensureJsPDF();
  const w = window as any; const { jsPDF } = w.jspdf;
  const doc = new jsPDF({orientation:'p', unit:'pt', format:'a4'});
  let first=true;
  groups.forEach(g=>{
    if(!first) doc.addPage();
    first=false;
    doc.setFontSize(14); doc.text(`Laporan - ${g.name}`, 40, 40);
    const head = [['Tanggal','Keterangan','Kategori','Tipe','Jumlah']];
    const body = g.rows.map(r=> [r.date, (r.description||''), r.category, r.type, new Intl.NumberFormat('id-ID').format(r.amount)]);
    (doc as any).autoTable({ startY: 60, head, body, styles:{fontSize:9}, headStyles:{fillColor:[37,99,235]} });
  });
  downloadBlob(doc.output('blob'), 'laporan.pdf');
}

function exportDOC(groups: Array<{name:string; rows: Transaction[]}>){
  const parts = groups.map(g=>{
    const rowsHtml = g.rows.map(r=> `<tr><td>${r.date}</td><td>${(r.description||'')}</td><td>${r.category}</td><td>${r.type}</td><td style="text-align:right">${new Intl.NumberFormat('id-ID').format(r.amount)}</td></tr>`).join('');
    return `<h3>${g.name}</h3><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Tipe</th><th>Jumlah</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }).join('<div style="page-break-after:always"></div>');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px}th{background:#f3f4f6}</style></head><body>${parts}</body></html>`;
  downloadBlob(new Blob([html], {type:'application/msword'}), 'laporan.doc');
}

// Template downloads
document.getElementById('btn-template-excel')?.addEventListener('click', ()=>{
  const headers = [['Tanggal','Keterangan','Kategori','Tipe','Jumlah']];
  const blob = new Blob([headers.map(r=>r.join(',')).join('\n')+'\n'], {type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='template-laporan-excel.csv'; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('btn-template-word')?.addEventListener('click', ()=>{
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px}th{background:#f3f4f6}</style></head><body><h2>Template Laporan</h2><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Tipe</th><th>Jumlah</th></tr></thead><tbody><tr><td>2025-08-01</td><td>Iuran Bulanan</td><td>Iuran</td><td>Masuk</td><td>150000</td></tr></tbody></table></body></html>`;
  const blob = new Blob([html], {type:'application/msword'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='template-laporan.doc'; a.click(); URL.revokeObjectURL(a.href);
});

// Execute export
btnDoExport?.addEventListener('click', async ()=>{
  const rows = getFilteredTransactions();
  const groups = groupRowsLaporan(rows, splitSelect?.value || 'none');
  try{
    if(exportFormat==='xlsx') await exportXLSX(groups);
    else if(exportFormat==='pdf') await exportPDF(groups);
    else exportDOC(groups);
    showToast('Ekspor berhasil dimulai', 'success');
  }catch(e){ console.error(e); showToast('Gagal mengekspor. Coba lagi.', 'error'); }
  closeExport();
});

function addAdminNotif(type: 'info'|'success'|'warning'|'error', title: string, message: string){
  try {
    const api = (window as any)?.KKNotif;
    if (api && typeof api.add === 'function') {
      api.add(type, title, message);
    }
  } catch {}
}

function handleReportSubmit(event: Event) {
  event.preventDefault();
  const inputTitle = (document.getElementById('rep-title') as HTMLInputElement | null)?.value?.trim() || '';
  let startDate = (document.getElementById('rep-start') as HTMLInputElement | null)?.value || '';
  let endDate = (document.getElementById('rep-end') as HTMLInputElement | null)?.value || '';
  const type = (document.getElementById('rep-type') as HTMLSelectElement | null)?.value || 'Bulanan';
  const source = (document.getElementById('rep-source') as HTMLSelectElement | null)?.value || 'Gabungan';

  // Defaults: use current filters, else current month
  if (!startDate || !endDate) {
    if (appState.filters.start && appState.filters.end) {
      startDate = startDate || appState.filters.start;
      endDate = endDate || appState.filters.end;
    } else {
      const def = getDefaultPeriod();
      startDate = startDate || def.start;
      endDate = endDate || def.end;
    }
  }

  // Title default based on month or date range
  let title = inputTitle;
  if (!title) {
    const sameMonth = startDate.slice(0,7) === endDate.slice(0,7);
    if (sameMonth) {
      const monthName = new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      title = `Laporan Keuangan ${monthName}`;
    } else {
      title = `Laporan ${formatDateID(startDate)}—${formatDateID(endDate)}`;
    }
  }

  // Support transaction-like fields as an alternative input style
  const txDate = (document.getElementById('tx-date') as HTMLInputElement | null)?.value || '';
  const txDesc = (document.getElementById('tx-desc') as HTMLInputElement | null)?.value?.trim() || '';
  const txTypeRaw = (document.getElementById('tx-type') as HTMLSelectElement | null)?.value || '';
  const txCategory = (document.getElementById('tx-category') as HTMLSelectElement | null)?.value || '';
  const txAmount = Number((document.getElementById('tx-amount') as HTMLInputElement | null)?.value || '0') || 0;
  // Pemetaan tipe: jika user memilih 'Transaksi' perlakukan sebagai 'Keluar' (uang kas berkurang)
  const txType: TxType | undefined = txTypeRaw
    ? (txTypeRaw === 'Keluar' || txTypeRaw === 'Transaksi' ? 'Keluar' : 'Masuk')
    : undefined;
  if (txDate) {
    if (!startDate) startDate = txDate;
    if (!endDate) endDate = txDate;
    if (!inputTitle && !title) title = `Laporan ${formatDateID(txDate)}`;
  }

  const formData = { title, startDate, endDate, type, source } as Partial<Report> & { type: string; source: string };
  const author = (document.getElementById('rep-owner') as HTMLInputElement | null)?.value.trim() || '';
  const reference = (document.getElementById('rep-ref') as HTMLInputElement | null)?.value.trim() || '';
  const tags = ((document.getElementById('rep-tags') as HTMLInputElement | null)?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const includeZero = (document.getElementById('rep-include-zero') as HTMLInputElement | null)?.checked || false;
  let notes = (document.getElementById('rep-note') as HTMLTextAreaElement | null)?.value.trim() || '';
  if (!notes && txDesc) notes = txDesc;

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

  // Build snapshot from transaction-style inputs
  const snapshot: ReportSnapshot | undefined = (txDate || txDesc || txType || txCategory || txAmount > 0)
    ? { txType, formType: txTypeRaw || undefined, txDate, txCategory, txAmount, txDesc }
    : undefined;

  // If snapshot represents a valid transaction, also add it to the ledger
  if (snapshot && snapshot.txType && typeof snapshot.txAmount === 'number' && snapshot.txAmount > 0) {
    const newTx: Transaction = {
      date: snapshot.txDate || new Date().toISOString().slice(0,10),
      type: snapshot.txType,
      category: snapshot.txCategory || 'Lainnya',
      description: snapshot.txDesc || title,
      amount: snapshot.txAmount
    };
    appState.transactions.push(newTx);
    // Keep transactions sorted by date ascending to maintain consistency
    appState.transactions.sort((a, b) => a.date.localeCompare(b.date));
    // Persist and refresh UI; suppress auto-monthly report to avoid duplicate with this manual report
    persistTransactionsAndRefresh(newTx.date, { suppressAutoMonthly: true });
  }

  const report: Report = { id: Date.now(), ...(formData as any), snapshot, adjustments, totals: finalTotals, createdAt: new Date().toISOString() };
  appState.reports.unshift(report);
  appState.activeReportId = report.id;
  saveReports();

  appState.filters.start = formData.startDate || '';
  appState.filters.end = formData.endDate || '';
  appState.filters.preset = 'custom';

  refreshDashboard();
  // Reset the actual form element and adjustments list
  const reportForm = ((event.target as HTMLElement)?.closest && (event.target as HTMLElement).closest('form')) as HTMLFormElement | null
    || (document.getElementById('form-report') as HTMLFormElement | null);
  if (reportForm && typeof reportForm.reset === 'function') reportForm.reset();
  const adjList = document.getElementById('adj-list');
  if (adjList) adjList.innerHTML = '';
  closeDrawer();
  showToast('Laporan berhasil dibuat dan disimpan', 'success');
  try { addAdminNotif('info', 'Laporan Keuangan Baru', `Laporan "${title}" berhasil dibuat.`) } catch {}
  // Jangan auto-redirect ke halaman Transaksi; biarkan admin tetap di halaman Laporan
  // Informasikan saja via notifikasi jika snapshot berisi transaksi
  try {
    if (snapshot && snapshot.txAmount && snapshot.txAmount > 0) {
      addAdminNotif('info', 'Transaksi Tersimpan', 'Transaksi dari snapshot juga telah ditambahkan ke buku besar.');
    }
  } catch {}
}

// New: Handle transaction creation from the drawer form
function handleTransactionSubmit(event: Event) {
  event.preventDefault();
  const rawType = (document.getElementById('tx-type') as HTMLSelectElement | null)?.value || 'Masuk';
  const type: TxType = rawType === 'Keluar' ? 'Keluar' : 'Masuk';
  const date = (document.getElementById('tx-date') as HTMLInputElement | null)?.value || new Date().toISOString().slice(0,10);
  const category = (document.getElementById('tx-category') as HTMLSelectElement | null)?.value || 'Iuran';
  const amount = Number((document.getElementById('tx-amount') as HTMLInputElement | null)?.value || '0');
  const description = (document.getElementById('tx-desc') as HTMLInputElement | null)?.value || '';

  if (!date) { showToast('Tanggal wajib diisi', 'warning'); return }
  if (!amount || amount <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return }

  const tx: Transaction = { date, type, category, description, amount };
  // Save into app state and localStorage
  appState.transactions.push(tx);
  appState.transactions.sort((a,b)=> a.date.localeCompare(b.date));
  try { localStorage.setItem('financial_transactions_v2', JSON.stringify(appState.transactions)) } catch (e) { console.warn('Could not save transactions:', e) }

  // Update filters to include the date if needed
  if (!appState.filters.start || date < appState.filters.start) appState.filters.start = date;
  if (!appState.filters.end || date > appState.filters.end) appState.filters.end = date;
  appState.filters.preset = 'custom';

  refreshDashboard();
  // Reset the actual form element (event target may be a button)
  const formEl = ((event.target as HTMLElement)?.closest && (event.target as HTMLElement).closest('form')) as HTMLFormElement | null
    || (document.getElementById('form-transaction') as HTMLFormElement | null)
    || (document.getElementById('form-report') as HTMLFormElement | null);
  if (formEl && typeof formEl.reset === 'function') formEl.reset();
  // Keep today as default after reset
  const dateInput = document.getElementById('tx-date') as HTMLInputElement | null;
  if (dateInput) dateInput.value = new Date().toISOString().slice(0,10);
  closeDrawer();
  showToast('Transaksi berhasil disimpan', 'success');
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

// Initialize month navigation event listeners
function initializeMonthNavigation() {
  const prevBtn = document.querySelector('.prev-month') as HTMLButtonElement | null;
  const nextBtn = document.querySelector('.next-month') as HTMLButtonElement | null;
  const monthInput = document.getElementById('iuran-month') as HTMLInputElement | null;
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPreviousMonth();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToNextMonth();
    });
  }
  
  if (monthInput) {
    // Set initial value to current month
    monthInput.value = currentRealTimeMonth;
    
    // Update navigation buttons when month input changes
    monthInput.addEventListener('change', () => {
      updateMonthNavigationButtons();
      renderDuesSection();
    });
    
    // Update navigation buttons on initial load
    updateMonthNavigationButtons();
  }
}

// Initialize real-time month tracking
function initializeRealTimeTracking() {
  // Update real-time month every minute
  setInterval(updateRealTimeMonth, 60000); // 60 seconds
  
  // Also check on page visibility change (when user comes back to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateRealTimeMonth();
    }
  });
  
  console.log(`[Real-time] Month tracking initialized. Current month: ${currentRealTimeMonth}`);
}

// Script loading and initialization
script.onload = () => { 
  configureChartDefaults(); 
  initializeApp();
  
  // Initialize month navigation
  setTimeout(() => {
    initializeMonthNavigation();
    initializeRealTimeTracking();
  }, 500);
  
  // Initialize real-time chart updates setelah chart dibuat
  setTimeout(() => {
    initRealTimeCharts();
  }, 2000);
};
script.onerror = () => { console.error('Failed to load Chart.js'); removeSkeletons(); showEmptyCharts(); initializeApp() };
setTimeout(() => { if (!(window as any).Chart) { console.warn('Chart.js loading timeout'); removeSkeletons(); showEmptyCharts() } }, 3000);
setTimeout(initializeApp, 100);