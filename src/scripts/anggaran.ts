// Chart.js is provided by layout; we just wait for readiness via 'charts-ready'.
// TS helper: declare global Chart on window for type-safety
declare global {
  interface Window { Chart: any }
}
export {};

// Global Chart registry to avoid canvas reuse across navigations/rerenders
;(function initChartRegistry(){
  (window as any).dashboardCharts = (window as any).dashboardCharts || new Map();
})();

function destroyChartForCanvasId(id: string){
  try{
    const w: any = window as any;
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if(!canvas) return;
    const reg: Map<string, any> = w.dashboardCharts;
    const prev = reg?.get?.(id);
    if(prev && typeof prev.destroy === 'function'){
      prev.destroy();
      reg.delete(id);
    }
    if(w.Chart && typeof w.Chart.getChart === 'function'){
      const bound = w.Chart.getChart(canvas);
      if(bound && typeof bound.destroy === 'function'){
        bound.destroy();
      }
    }
  }catch{ /* noop */ }
}

function getCtxPrepared(id: string): CanvasRenderingContext2D | null{
  destroyChartForCanvasId(id);
  const el = document.getElementById(id) as HTMLCanvasElement | null;
  return el ? el.getContext('2d') : null;
}

// Utilities
const fmtIDR = (n: number): string => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Math.round(n || 0));

const fmtNum = (n: number): string => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

const fmtDateID = (iso: string): string => new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const toISO = (d: Date): string => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Categories palette
const CAT_META = [
  { name: 'Environment', color: '#22c55e' },
  { name: 'Security', color: '#f97316' },
  { name: 'Cleanliness', color: '#10b981' },
  { name: 'Administration', color: '#64748b' },
  { name: 'Facilities', color: '#8b5cf6' },
  { name: 'Social', color: '#ef4444' },
  { name: 'Events', color: '#60a5fa' },
  { name: 'Donations', color: '#84cc16' }
];

const catColor = (c: string): string => (CAT_META.find(x => x.name === c)?.color) || '#64748b';

// State
type BudgetItem = { name: string; category: string; plan: number; actual: number };
type BudgetPlan = { id: string; title: string; start: string; end: string; items: BudgetItem[] };
type ChartsState = { pr: any; pie: any; prog: any };
type Filters = { start: string; end: string; q: string; cat: string; min: number; max: number; preset: string };
type State = { plans: BudgetPlan[]; activePlanId: string | null; filters: Filters; charts: ChartsState; trx: any[] };

const state: State = {
  plans: [],
  activePlanId: null,
  filters: {
    start: '',
    end: '',
    q: '',
    cat: 'Semua',
    min: 0,
    max: 0,
    preset: 'bulan-ini'
  },
  charts: { pr: null, pie: null, prog: null },
  trx: []
};

// Load transactions master (optional)
function loadMasterTrx() {
  try {
    state.trx = JSON.parse(localStorage.getItem('lap_trx_master_v1') || '[]');
  } catch (_) {
    state.trx = [];
  }
  if (!Array.isArray(state.trx)) state.trx = [];
}
loadMasterTrx();

// Seed category filter
(function seedCatFilter() {
  const sel = document.getElementById('filter-cat');
  if (!sel) return;
  CAT_META.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
})();

// Plans storage
function loadPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bud_plans_v1') || '[]');
    const parsedPlans: any[] = Array.isArray(parsed) ? parsed : [];
    // Normalize potential legacy shapes to the expected schema
    function normalize(plans: any[]): BudgetPlan[] {
      return plans.map((p: any): BudgetPlan => {
        const items: any[] = Array.isArray(p?.items) ? p.items : Array.isArray(p?.detail) ? p.detail : [];
        const normItems: BudgetItem[] = items.map((it: any): BudgetItem => {
          // Support various key aliases commonly used
          const name = it?.name ?? it?.kegiatan ?? it?.activity ?? '-';
          const category = it?.category ?? it?.kategori ?? it?.kat ?? 'Lainnya';
          const plan = Number(it?.plan ?? it?.rencana ?? it?.budget ?? it?.jumlah ?? 0);
          const actual = Number(it?.actual ?? it?.realisasi ?? it?.aktual ?? it?.terpakai ?? 0);
          return { name, category, plan: isFinite(plan) ? plan : 0, actual: isFinite(actual) ? actual : 0 };
        });
        return {
          id: p?.id ?? p?.uuid ?? p?._id ?? (globalThis.crypto as any)?.randomUUID?.() ?? String(Date.now()),
          title: p?.title ?? p?.judul ?? p?.name ?? 'Tanpa Judul',
          start: p?.start ?? p?.dari ?? p?.from ?? p?.periodeMulai ?? '',
          end: p?.end ?? p?.sampai ?? p?.to ?? p?.periodeSelesai ?? '',
          items: normItems,
        };
      });
    }
    state.plans = normalize(parsedPlans);
  } catch (_) {
    state.plans = [];
  }
  if (!Array.isArray(state.plans)) state.plans = [];
  if (!state.activePlanId && state.plans[0]?.id) state.activePlanId = state.plans[0]!.id;
}

function savePlans() {
  localStorage.setItem('bud_plans_v1', JSON.stringify(state.plans));
}

loadPlans();
seedDemoIfEmpty();

// ---------- Rendering Helpers ----------
function getActivePlan(): BudgetPlan | null {
  const plans = state.plans;
  if (!plans.length) return null;
  const found = state.activePlanId ? plans.find((p) => p.id === state.activePlanId) ?? null : null;
  return found || plans[0] || null;
}

function calcPlanSummary(plan: BudgetPlan): { totalPlan: number; totalReal: number; remaining: number } {
  const items: BudgetItem[] = Array.isArray((plan as any)?.items) ? plan.items : [];
  let totalPlan = 0;
  let totalReal = 0;
  for (const it of items) {
    const p = Number(it?.plan ?? 0);
    const a = Number(it?.actual ?? 0);
    totalPlan += isFinite(p) ? p : 0;
    totalReal += isFinite(a) ? a : 0;
  }
  return { totalPlan, totalReal, remaining: totalPlan - totalReal };
}

function renderKPIs() {
  const plan = getActivePlan();
  const elPlan = document.getElementById('sum-plan');
  const elReal = document.getElementById('sum-real');
  const elRemain = document.getElementById('sum-remain');
  if (!elPlan || !elReal || !elRemain) return;
  if (!plan) {
    elPlan.textContent = 'Rp0';
    elReal.textContent = 'Rp0';
    elRemain.textContent = 'Rp0';
    return;
  }
  const s = calcPlanSummary(plan);
  elPlan.textContent = fmtIDR(s.totalPlan);
  elReal.textContent = fmtIDR(s.totalReal);
  elRemain.textContent = fmtIDR(s.remaining);
}

function renderPlanList() {
  const tbody = document.getElementById('plan-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!state.plans.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="6" class="empty-state">
          <div class="empty-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>Belum ada rencana anggaran.</p>
          </div>
        </td>`;
    tbody.appendChild(tr);
    return;
  }
  const active = getActivePlan();
  (state.plans || []).forEach((plan: BudgetPlan) => {
    const isActive = !!(active && active.id && plan && plan.id && (active.id === plan.id));
    const { totalPlan, totalReal, remaining } = calcPlanSummary(plan);
    const tr = document.createElement('tr');
    const period = (plan?.start && plan?.end) ? `${fmtDateID(plan.start)} - ${fmtDateID(plan.end)}` : '—';
    tr.innerHTML = `
          <td>${plan?.title || 'Tanpa Judul'}</td>
          <td>${period}</td>
          <td class="text-right">${fmtIDR(totalPlan)}</td>
          <td class="text-right">${fmtIDR(totalReal)}</td>
          <td class="text-right">${fmtIDR(remaining)}</td>
          <td>
            <div class="table-actions">
              <button class="btn secondary btn-set-active" data-id="${plan.id}">${isActive ? 'Aktif' : 'Jadikan Aktif'}</button>
            </div>
          </td>
        `;
    tbody.appendChild(tr);
  });
  // Bind set active buttons
  tbody.querySelectorAll('.btn-set-active').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement | null;
      const id = target ? target.getAttribute('data-id') : null;
      if (!id) return;
      state.activePlanId = id;
      renderAll();
    });
  });
}

function renderBudgetDetail() {
  const tbody = document.getElementById('budget-tbody');
  if (!tbody) return;
  const plan = getActivePlan();
  tbody.innerHTML = '';
  if (!plan || !Array.isArray(plan.items) || !plan.items.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="6" class="empty-state">
          <div class="empty-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>Tidak ada rencana aktif.</p>
          </div>
        </td>`;
    tbody.appendChild(tr);
    return;
  }
  const items: BudgetItem[] = Array.isArray(plan.items) ? plan.items : [];
  items.forEach((it: BudgetItem) => {
    const planAmt = Number(it?.plan || 0);
    const actAmt = Number(it?.actual || 0);
    const remain = planAmt - actAmt;
    const pct = planAmt > 0 ? Math.round((actAmt / planAmt) * 100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
          <td>${it?.name || (it as any)?.activity || '-'}</td>
          <td>${it?.category || '-'}</td>
          <td class="text-right">${fmtIDR(planAmt)}</td>
          <td class="text-right">${fmtIDR(actAmt)}</td>
          <td class="text-right">${fmtIDR(remain)}</td>
          <td class="text-right">${fmtNum(pct)}%</td>
        `;
    tbody.appendChild(tr);
  });
}

function renderAll() {
  renderKPIs();
  renderPlanList();
  renderBudgetDetail();
  renderOverspend();
  renderCharts();
}

function bindUI() {
  const btnOpen = document.getElementById('btn-open-drawer');
  const btnClose = document.getElementById('btn-close-drawer');
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  function openDrawer() {
    (drawer as HTMLElement | null)?.classList.add('open');
    (backdrop as HTMLElement | null)?.classList.add('open');
  }
  function closeDrawer() {
    (drawer as HTMLElement | null)?.classList.remove('open');
    (backdrop as HTMLElement | null)?.classList.remove('open');
  }
  btnOpen?.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
  btnClose?.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); });
  backdrop?.addEventListener('click', closeDrawer as any);

  // Quick period preset chips
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.chip-group [data-preset]'));
  const inputStart = document.getElementById('filter-start') as HTMLInputElement | null;
  const inputEnd = document.getElementById('filter-end') as HTMLInputElement | null;

  function applyPreset(preset: string) {
    state.filters.preset = preset;
    const { start, end } = getPresetRange(preset);
    state.filters.start = start;
    state.filters.end = end;
    if (inputStart) inputStart.value = start;
    if (inputEnd) inputEnd.value = end;
    chips.forEach((c) => c.classList.toggle('active', c.dataset.preset === preset));
    renderAll();
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const preset = (e.currentTarget as HTMLElement).getAttribute('data-preset') || 'bulan-ini';
      applyPreset(preset);
    });
  });

  // Manual date inputs
  inputStart?.addEventListener('change', () => {
    state.filters.start = inputStart.value || '';
    state.filters.preset = 'custom';
    chips.forEach((c) => c.classList.remove('active'));
    renderAll();
  });
  inputEnd?.addEventListener('change', () => {
    state.filters.end = inputEnd.value || '';
    state.filters.preset = 'custom';
    chips.forEach((c) => c.classList.remove('active'));
    renderAll();
  });

  window.addEventListener('storage', (ev) => {
    if ((ev as StorageEvent).key === 'bud_plans_v1') {
      loadPlans();
      seedDemoIfEmpty();
      renderAll();
    }
  });

  // Initialize default preset on first load if empty
  if (!state.filters.start || !state.filters.end) {
    applyPreset(state.filters.preset || 'bulan-ini');
  }
}

// Compute date range for presets
function getPresetRange(preset: string): { start: string; end: string } {
  const now = new Date();
  let start = '', end = '';
  switch (preset) {
    case 'bulan-lalu': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      start = toISO(first); end = toISO(last); break;
    }
    case 'qtd': {
      const q = Math.floor(now.getMonth() / 3); // 0..3
      const first = new Date(now.getFullYear(), q * 3, 1);
      start = toISO(first); end = toISO(now); break;
    }
    case 'ytd': {
      const first = new Date(now.getFullYear(), 0, 1);
      start = toISO(first); end = toISO(now); break;
    }
    case 'semua': {
      // empty means no restriction
      start = ''; end = ''; break;
    }
    case 'bulan-ini':
    default: {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = toISO(first); end = toISO(last); break;
    }
  }
  return { start, end };
}

// Overspend detection list rendering
function renderOverspend() {
  const ul = document.getElementById('overspend-list');
  if (!ul) return;
  ul.innerHTML = '';
  const plan = getActivePlan();
  if (!plan || !plan.items?.length) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = 'Tidak ada rencana aktif.';
    ul.appendChild(li);
    return;
  }

  // Analyze items
  const findings: { level: 'danger' | 'warn'; text: string }[] = [];
  for (const it of plan.items) {
    const p = Number(it?.plan || 0);
    const a = Number(it?.actual || 0);
    if (p <= 0) continue;
    const pct = Math.round((a / p) * 100);
    if (a > p) {
      findings.push({ level: 'danger', text: `Pemborosan: ${it.name} (${it.category}) realisasi ${fmtIDR(a)} melebihi rencana ${fmtIDR(p)} (${fmtNum(pct)}%).` });
    } else if (pct >= 90) {
      findings.push({ level: 'warn', text: `Hampir melebihi: ${it.name} (${it.category}) sudah ${fmtNum(pct)}% dari rencana.` });
    }
  }

  if (!findings.length) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = 'Tidak ditemukan pemborosan pada rencana aktif.';
    ul.appendChild(li);
    return;
  }

  findings.forEach(f => {
    const li = document.createElement('li');
    li.className = f.level === 'danger' ? 'anomaly danger' : 'anomaly warn';
    li.textContent = f.text;
    ul.appendChild(li);
  });
}

// Dev-only demo data seeding to make the page interactive immediately
function seedDemoIfEmpty() {
  try {
    const isDev = (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) ||
                  ['localhost', '127.0.0.1'].includes(location.hostname);
    const alreadySeeded = localStorage.getItem('bud_demo_seeded_v1') === '1';
    if (!isDev || alreadySeeded) return;
    if (Array.isArray(state.plans) && state.plans.length > 0) return;

    const demo: BudgetPlan = {
      id: (globalThis.crypto as any)?.randomUUID?.() ?? String(Date.now()),
      title: 'Rencana Bulan Ini (Demo)',
      start: toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      end: toISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
      items: [
        { name: 'Perawatan Taman', category: 'Environment', plan: 1200000, actual: 400000 },
        { name: 'Satpam', category: 'Security', plan: 2000000, actual: 1200000 },
        { name: 'Kebersihan Harian', category: 'Cleanliness', plan: 1500000, actual: 900000 },
        { name: 'ATK & Administrasi', category: 'Administration', plan: 600000, actual: 150000 },
        { name: 'Perbaikan Lampu', category: 'Facilities', plan: 900000, actual: 300000 },
        { name: 'Santunan', category: 'Social', plan: 500000, actual: 250000 },
        { name: 'HUT RT', category: 'Events', plan: 1000000, actual: 0 },
        { name: 'Dana Cadangan', category: 'Donations', plan: 750000, actual: 0 },
      ]
    };
    state.plans = [demo];
    state.activePlanId = demo.id;
    savePlans();
    localStorage.setItem('bud_demo_seeded_v1', '1');
  } catch { /* no-op */ }
}

// Initialize after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Ensure demo data exists in dev before first render
  seedDemoIfEmpty();
  renderAll();
  bindUI();
  // Reveal sections that are initially hidden with .pre-anim
  document.querySelectorAll('.pre-anim').forEach((el) => (el as HTMLElement).classList.add('reveal'));
});

// -------------- Charts (Plan vs Actual, Pie Composition, Progress) --------------
// Color utilities
function hexToRgba(hex: string, alpha: number = 1): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#64748b');
  if (!m) return `rgba(100,116,139,${alpha})`;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Bright categorical palette (stable across categories)
const PALETTE = [
  '#4361EE', '#06D6A0', '#EF476F', '#F9C74F', '#4CC9F0',
  '#FF7F50', '#8D99AE', '#8338EC', '#3A86FF', '#FB5607',
  '#2EC4B6', '#E71D36', '#FFBE0B', '#118AB2', '#06A77D'
];
function hashCode(str: string): number {
  let h = 0; const s = String(str || '');
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function colorFor(name: string): string {
  const found = CAT_META.find(x => x.name === name);
  const base = found ? found.color : (PALETTE[hashCode(name) % PALETTE.length] || '#64748b');
  return base;
}

// Hide skeleton by id if exists
function hideSkel(id: string) {
  const el = document.getElementById(id);
  if (el) (el as HTMLElement).style.display = 'none';
}

function aggregateByCategory(): Record<string, { plan: number; actual: number }> {
  const plan = getActivePlan();
  const agg: Record<string, { plan: number; actual: number }> = {};
  if (!plan || !Array.isArray(plan.items)) return agg;
  for (const it of plan.items) {
    const cat = String(it?.category || 'Lainnya');
    if (!agg[cat]) agg[cat] = { plan: 0, actual: 0 };
    agg[cat].plan += Number(it?.plan || 0);
    agg[cat].actual += Number(it?.actual || 0);
  }
  return agg;
}

function destroyCharts() {
  try { (state.charts.pr as any)?.destroy?.(); } catch {}
  try { (state.charts.pie as any)?.destroy?.(); } catch {}
  try { (state.charts.prog as any)?.destroy?.(); } catch {}
  // Also ensure canvases are freed in case untracked
  ['bud-plan-real','bud-pie','bud-progress'].forEach(destroyChartForCanvasId);
  state.charts.pr = null; state.charts.pie = null; state.charts.prog = null;
}

function renderCharts(_retry: number = 0) {
  // Wait for Chart global (handles case when charts-ready already fired)
  if (typeof (window as any).Chart === 'undefined') {
    const once = () => { window.removeEventListener('charts-ready', once); renderCharts(); };
    window.addEventListener('charts-ready', once, { once: true });
    if (_retry < 20) setTimeout(() => renderCharts(_retry + 1), 150); // also poll up to ~3s
    return;
  }
  // Access Chart from window for TS
  const Chart = (window as any).Chart as any;

  const agg = aggregateByCategory();
  const cats = Object.keys(agg);
  const planVals = cats.map(c => agg[c].plan);
  const actualVals = cats.map(c => agg[c].actual);

  // If no data, just destroy existing and keep skeletons visible
  if (!cats.length) { destroyCharts(); return; }

  // Common colors per category
  const bgPlan = cats.map(c => colorFor(c));
  const bgActual = cats.map(c => hexToRgba(colorFor(c), 0.6));

  // Plan vs Actual (bar)
  const elPR = document.getElementById('bud-plan-real');
  if (elPR && elPR instanceof HTMLCanvasElement) {
    hideSkel('sk-b1');
    const ctx = getCtxPrepared('bud-plan-real');
    if (ctx) {
      try { (state.charts.pr as any)?.destroy?.(); } catch {}
      state.charts.pr = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: cats,
          datasets: [
            { label: 'Rencana', data: planVals, backgroundColor: bgPlan, borderWidth: 0 },
            { label: 'Realisasi', data: actualVals, backgroundColor: bgActual, borderWidth: 0 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { callback: (v: any) => fmtIDR(Number(v)) } }
          },
          plugins: {
            legend: { position: 'top' },
            tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${fmtIDR(Number(ctx.parsed.y))}` } }
          }
        }
      });
      (window as any).dashboardCharts.set('bud-plan-real', state.charts.pr);
    }
  }

  // Pie composition (by plan amount)
  const elPie = document.getElementById('bud-pie');
  if (elPie && elPie instanceof HTMLCanvasElement) {
    hideSkel('sk-b2');
    const ctx = getCtxPrepared('bud-pie');
    if (ctx) {
      try { (state.charts.pie as any)?.destroy?.(); } catch {}
      state.charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: cats,
          datasets: [{ data: planVals, backgroundColor: bgPlan, borderColor: '#ffffff', borderWidth: 1 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${fmtIDR(Number(ctx.parsed))}` } }
          },
          cutout: '60%'
        }
      });
      (window as any).dashboardCharts.set('bud-pie', state.charts.pie);
    }
  }

  // Progress per category (% actual vs plan)
  const elProg = document.getElementById('bud-progress');
  if (elProg && elProg instanceof HTMLCanvasElement) {
    hideSkel('sk-b3');
    const ctx = getCtxPrepared('bud-progress');
    if (ctx) {
      try { (state.charts.prog as any)?.destroy?.(); } catch {}
      const pctVals = cats.map((c) => {
        const p = agg[c].plan; const a = agg[c].actual; return p > 0 ? Math.round((a / p) * 100) : 0;
      });
      const allZero = pctVals.every(v => v === 0);
      const plotVals = allZero ? pctVals.map(() => 0.1) : pctVals;
      state.charts.prog = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: cats,
          datasets: [{ label: '% Realisasi', data: plotVals, backgroundColor: cats.map(c => hexToRgba(colorFor(c), 0.85)), borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${Number(v)}%` } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx: any) => {
              const idx = ctx.dataIndex ?? 0; const val = pctVals[idx] ?? 0; return `${ctx.dataset.label}: ${val}%`;
            } } }
          }
        }
      });
      (window as any).dashboardCharts.set('bud-progress', state.charts.prog);
    }
  }
}

// Re-render charts when storage changes (plans updated in another tab)
window.addEventListener('storage', (ev: StorageEvent) => {
  if (ev.key === 'bud_plans_v1') {
    // renderAll() is already called in storage handler; charts will be updated there
    setTimeout(() => renderCharts(), 0);
  }
});
