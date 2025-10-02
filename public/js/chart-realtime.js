// Public copy of chart-realtime.js (bundler-independent)
import '/js/shared-state.js';

window.chartInstances = window.chartInstances || new Map();
window.chartUpdateInterval = null;
window.chartUpdateFrequency = 30000;

class ChartUpdateManager {
  constructor() {
    this.isActive = false;
    this.updateInterval = null;
    this.lastUpdateTime = 0;
    this.updateFrequency = 30000;
    this.charts = new Map();
    this.dataSources = new Map();
    this.financialSync = null;
  }
  registerChart(chartId, chartInstance, dataFetcher, updateCallback) {
    this.charts.set(chartId, { instance: chartInstance, dataFetcher, updateCallback, lastUpdate: 0 });
  }
  unregisterChart(chartId) {
    if (this.charts.has(chartId)) this.charts.delete(chartId);
  }
  start() {
    if (this.isActive) return;
    this.isActive = true;
    if (window.financialDataSync) {
      this.financialSync = window.financialDataSync;
      this.financialSync.init();
    }
    this.updateInterval = setInterval(() => { this.updateAllCharts(); }, this.updateFrequency);
  }
  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
  }
  async updateAllCharts() {
    if (this.charts.size === 0) return;
    const now = Date.now();
    const updatePromises = Array.from(this.charts.entries()).map(async ([, chartData]) => {
      try {
        const newData = await chartData.dataFetcher();
        chartData.updateCallback(newData);
        chartData.lastUpdate = now;
      } catch (error) { console.error('[ChartManager] update error:', error); }
    });
    await Promise.allSettled(updatePromises);
    this.lastUpdateTime = now;
  }
  async updateChart(chartId) {
    const chartData = this.charts.get(chartId);
    if (!chartData) return;
    try {
      const newData = await chartData.dataFetcher();
      chartData.updateCallback(newData);
      chartData.lastUpdate = Date.now();
    } catch (error) { console.error('[ChartManager] manual update error:', error); }
  }
  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(5000, frequency);
    if (this.isActive) { this.stop(); this.start(); }
  }
  getStatus() {
    return {
      isActive: this.isActive,
      updateFrequency: this.updateFrequency,
      registeredCharts: this.charts.size,
      lastUpdateTime: this.lastUpdateTime,
      charts: Array.from(this.charts.keys()),
      financialSync: this.financialSync && this.financialSync.getStatus ? this.financialSync.getStatus() : null
    };
  }
  subscribeToFinancialData() {
    if (!this.financialSync) return;
    this.financialSync.onTransactionsChange(() => this.updateAllCharts());
    this.financialSync.onReportsChange(() => this.updateAllCharts());
    this.financialSync.onLaporanSnapshotChange(() => this.updateAllCharts());
    this.financialSync.onWargaDataChange(() => this.updateAllCharts());
  }
}

window.chartUpdateManager = window.chartUpdateManager || new ChartUpdateManager();

export const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
export const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(`${dateStr}T00:00:00`); return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); };
export const safeFetch = async (url, options = {}) => { const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers||{}) } }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); };
export const animateChartUpdate = (chartInstance, newData) => { if (!chartInstance || !newData) return; chartInstance.data = newData; chartInstance.update('active'); };
export const chartColors = { primary: '#2563eb', success: '#16a34a', danger: '#dc2626', warning: '#f59e0b', info: '#0ea5e9', secondary: '#64748b', gradient: { primary: 'rgba(37,99,235,.15)', success: 'rgba(22,163,74,.15)', danger: 'rgba(220,38,38,.15)', warning: 'rgba(245,158,11,.15)' } };

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.chartUpdateManager.start();
    window.chartUpdateManager.subscribeToFinancialData();
  }, 2000);
});

window.addEventListener('beforeunload', () => { window.chartUpdateManager.stop(); });

export default ChartUpdateManager;
export { ChartUpdateManager };

