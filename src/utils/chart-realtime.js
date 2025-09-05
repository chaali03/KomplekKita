/**
 * Real-time Chart Update System
 * Sistem untuk update chart secara otomatis tanpa refresh halaman
 */

// Import shared state management
import { FinancialDataSync } from './shared-state.js';

// Global state untuk tracking chart instances
window.chartInstances = window.chartInstances || new Map();
window.chartUpdateInterval = null;
window.chartUpdateFrequency = 30000; // 30 detik default

/**
 * Chart Update Manager
 */
class ChartUpdateManager {
  constructor() {
    this.isActive = false;
    this.updateInterval = null;
    this.lastUpdateTime = 0;
    this.updateFrequency = 30000; // 30 detik
    this.charts = new Map();
    this.dataSources = new Map();
    this.financialSync = null;
  }

  /**
   * Register chart untuk auto-update
   * @param {string} chartId - ID unik chart
   * @param {Object} chartInstance - Instance Chart.js
   * @param {Function} dataFetcher - Function untuk fetch data baru
   * @param {Function} updateCallback - Function untuk update chart dengan data baru
   */
  registerChart(chartId, chartInstance, dataFetcher, updateCallback) {
    this.charts.set(chartId, {
      instance: chartInstance,
      dataFetcher,
      updateCallback,
      lastUpdate: 0
    });
    
    console.log(`[ChartManager] Chart ${chartId} registered for auto-update`);
  }

  /**
   * Unregister chart dari auto-update
   * @param {string} chartId - ID chart yang akan di-unregister
   */
  unregisterChart(chartId) {
    if (this.charts.has(chartId)) {
      this.charts.delete(chartId);
      console.log(`[ChartManager] Chart ${chartId} unregistered`);
    }
  }

  /**
   * Start auto-update system
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Initialize financial sync jika tersedia
    if (window.financialDataSync) {
      this.financialSync = window.financialDataSync;
      this.financialSync.init();
    }
    
    this.updateInterval = setInterval(() => {
      this.updateAllCharts();
    }, this.updateFrequency);
    
    console.log(`[ChartManager] Auto-update started (${this.updateFrequency}ms interval)`);
  }

  /**
   * Stop auto-update system
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log('[ChartManager] Auto-update stopped');
  }

  /**
   * Update semua chart yang terdaftar
   */
  async updateAllCharts() {
    if (this.charts.size === 0) return;
    
    const now = Date.now();
    console.log(`[ChartManager] Updating ${this.charts.size} charts...`);
    
    // Update charts secara parallel untuk performa lebih baik
    const updatePromises = Array.from(this.charts.entries()).map(async ([chartId, chartData]) => {
      try {
        // Fetch data baru
        const newData = await chartData.dataFetcher();
        
        // Update chart dengan data baru
        chartData.updateCallback(newData);
        
        // Update timestamp
        chartData.lastUpdate = now;
        
        console.log(`[ChartManager] Chart ${chartId} updated successfully`);
      } catch (error) {
        console.error(`[ChartManager] Failed to update chart ${chartId}:`, error);
      }
    });
    
    await Promise.allSettled(updatePromises);
    this.lastUpdateTime = now;
  }

  /**
   * Update chart tertentu secara manual
   * @param {string} chartId - ID chart yang akan di-update
   */
  async updateChart(chartId) {
    const chartData = this.charts.get(chartId);
    if (!chartData) {
      console.warn(`[ChartManager] Chart ${chartId} not found`);
      return;
    }
    
    try {
      const newData = await chartData.dataFetcher();
      chartData.updateCallback(newData);
      chartData.lastUpdate = Date.now();
      console.log(`[ChartManager] Chart ${chartId} updated manually`);
    } catch (error) {
      console.error(`[ChartManager] Failed to update chart ${chartId}:`, error);
    }
  }

  /**
   * Set update frequency
   * @param {number} frequency - Frequency dalam milliseconds
   */
  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(5000, frequency); // Minimum 5 detik
    
    if (this.isActive) {
      this.stop();
      this.start();
    }
    
    console.log(`[ChartManager] Update frequency set to ${this.updateFrequency}ms`);
  }

  /**
   * Get status info
   */
  getStatus() {
    return {
      isActive: this.isActive,
      updateFrequency: this.updateFrequency,
      registeredCharts: this.charts.size,
      lastUpdateTime: this.lastUpdateTime,
      charts: Array.from(this.charts.keys()),
      financialSync: this.financialSync ? this.financialSync.getStatus() : null
    };
  }

  /**
   * Subscribe ke perubahan data financial untuk auto-update charts
   */
  subscribeToFinancialData() {
    if (!this.financialSync) return;

    // Subscribe ke perubahan transaksi
    this.financialSync.onTransactionsChange(() => {
      console.log('[ChartManager] Financial transactions changed, updating charts...');
      this.updateAllCharts();
    });

    // Subscribe ke perubahan laporan
    this.financialSync.onReportsChange(() => {
      console.log('[ChartManager] Financial reports changed, updating charts...');
      this.updateAllCharts();
    });

    // Subscribe ke perubahan snapshot laporan
    this.financialSync.onLaporanSnapshotChange(() => {
      console.log('[ChartManager] Laporan snapshot changed, updating charts...');
      this.updateAllCharts();
    });

    // Subscribe ke perubahan data warga
    this.financialSync.onWargaDataChange(() => {
      console.log('[ChartManager] Warga data changed, updating charts...');
      this.updateAllCharts();
    });

    console.log('[ChartManager] Subscribed to financial data changes');
  }
}

// Global instance
window.chartUpdateManager = window.chartUpdateManager || new ChartUpdateManager();

/**
 * Utility functions untuk chart updates
 */

/**
 * Format currency untuk chart tooltips
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format date untuk chart labels
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Safe fetch wrapper dengan error handling
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[ChartManager] Fetch error for ${url}:`, error);
    throw error;
  }
};

/**
 * Chart animation utilities
 */
export const animateChartUpdate = (chartInstance, newData, duration = 1000) => {
  if (!chartInstance || !newData) return;
  
  // Smooth transition untuk chart update
  chartInstance.data = newData;
  chartInstance.update('active');
};

/**
 * Default chart colors untuk konsistensi
 */
export const chartColors = {
  primary: '#2563eb',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  info: '#0ea5e9',
  secondary: '#64748b',
  gradient: {
    primary: 'rgba(37, 99, 235, 0.15)',
    success: 'rgba(22, 163, 74, 0.15)',
    danger: 'rgba(220, 38, 38, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)'
  }
};

/**
 * Auto-start chart update manager ketika DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Start auto-update setelah 2 detik delay
  setTimeout(() => {
    window.chartUpdateManager.start();
    // Subscribe ke perubahan data financial
    window.chartUpdateManager.subscribeToFinancialData();
  }, 2000);
});

/**
 * Cleanup ketika page unload
 */
window.addEventListener('beforeunload', () => {
  window.chartUpdateManager.stop();
});

// Export untuk penggunaan di file lain
export default ChartUpdateManager;
export { ChartUpdateManager };
