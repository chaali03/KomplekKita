/**
 * Shared State Management System
 * Sistem untuk sinkronisasi data antar halaman tanpa refresh
 */

// Global state manager
class SharedStateManager {
  constructor() {
    this.state = new Map();
    this.listeners = new Map();
    this.storageKeys = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize shared state manager
   */
  init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // Listen untuk perubahan localStorage dari tab lain
    window.addEventListener('storage', (e) => {
      if (e.key && this.storageKeys.has(e.key)) {
        this.handleStorageChange(e.key, e.newValue);
      }
    });

    // Listen untuk custom events
    window.addEventListener('shared-state-update', (e) => {
      if (e.detail && e.detail.key) {
        this.handleStateUpdate(e.detail.key, e.detail.value);
      }
    });

    console.log('[SharedState] Manager initialized');
  }

  /**
   * Register storage key untuk monitoring
   * @param {string} key - Storage key
   */
  registerStorageKey(key) {
    this.storageKeys.add(key);
  }

  /**
   * Subscribe ke perubahan state
   * @param {string} key - State key
   * @param {Function} callback - Callback function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Update state dan notify listeners
   * @param {string} key - State key
   * @param {any} value - New value
   * @param {boolean} persist - Whether to persist to localStorage
   */
  updateState(key, value, persist = true) {
    this.state.set(key, value);
    
    if (persist) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        this.registerStorageKey(key);
      } catch (error) {
        console.warn(`[SharedState] Failed to persist ${key}:`, error);
      }
    }

    // Notify listeners
    this.notifyListeners(key, value);
    
    // Dispatch custom event untuk tab yang sama
    window.dispatchEvent(new CustomEvent('shared-state-update', {
      detail: { key, value }
    }));
  }

  /**
   * Get state value
   * @param {string} key - State key
   * @param {any} defaultValue - Default value if not found
   */
  getState(key, defaultValue = null) {
    if (this.state.has(key)) {
      return this.state.get(key);
    }

    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const value = JSON.parse(stored);
        this.state.set(key, value);
        this.registerStorageKey(key);
        return value;
      }
    } catch (error) {
      console.warn(`[SharedState] Failed to load ${key}:`, error);
    }

    return defaultValue;
  }

  /**
   * Handle storage change dari tab lain
   * @param {string} key - Storage key
   * @param {string} newValue - New value (JSON string)
   */
  handleStorageChange(key, newValue) {
    try {
      const value = newValue ? JSON.parse(newValue) : null;
      this.state.set(key, value);
      this.notifyListeners(key, value);
    } catch (error) {
      console.warn(`[SharedState] Failed to parse storage change for ${key}:`, error);
    }
  }

  /**
   * Handle state update dari custom event
   * @param {string} key - State key
   * @param {any} value - New value
   */
  handleStateUpdate(key, value) {
    this.state.set(key, value);
    this.notifyListeners(key, value);
  }

  /**
   * Notify all listeners untuk key tertentu
   * @param {string} key - State key
   * @param {any} value - New value
   */
  notifyListeners(key, value) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          console.error(`[SharedState] Error in listener for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Clear state dan localStorage
   * @param {string} key - State key (optional, clears all if not provided)
   */
  clearState(key) {
    if (key) {
      this.state.delete(key);
      localStorage.removeItem(key);
      this.storageKeys.delete(key);
    } else {
      this.state.clear();
      this.storageKeys.forEach(storageKey => {
        localStorage.removeItem(storageKey);
      });
      this.storageKeys.clear();
    }
  }

  /**
   * Get all registered keys
   */
  getKeys() {
    return Array.from(this.storageKeys);
  }

  /**
   * Get state info untuk debugging
   */
  getInfo() {
    return {
      isInitialized: this.isInitialized,
      stateKeys: Array.from(this.state.keys()),
      storageKeys: Array.from(this.storageKeys),
      listenerCount: Array.from(this.listeners.entries()).reduce((acc, [key, callbacks]) => {
        acc[key] = callbacks.size;
        return acc;
      }, {})
    };
  }
}

// Global instance
window.sharedStateManager = window.sharedStateManager || new SharedStateManager();

/**
 * Financial Data Synchronization
 * Khusus untuk sinkronisasi data keuangan antar halaman
 */
class FinancialDataSync {
  constructor() {
    this.stateManager = window.sharedStateManager;
    this.isInitialized = false;
  }

  /**
   * Initialize financial data sync
   */
  init() {
    if (this.isInitialized) return;
    
    this.stateManager.init();
    this.isInitialized = true;

    // Register financial data keys
    this.stateManager.registerStorageKey('financial_transactions_v2');
    this.stateManager.registerStorageKey('financial_reports');
    this.stateManager.registerStorageKey('laporan_totals_snapshot');
    this.stateManager.registerStorageKey('laporan_chart_series');
    this.stateManager.registerStorageKey('warga_data');
    this.stateManager.registerStorageKey('dues_configs');
    this.stateManager.registerStorageKey('dues_payments');

    console.log('[FinancialSync] Initialized');
  }

  /**
   * Subscribe ke perubahan data transaksi
   * @param {Function} callback - Callback function
   */
  onTransactionsChange(callback) {
    return this.stateManager.subscribe('financial_transactions_v2', callback);
  }

  /**
   * Subscribe ke perubahan data laporan
   * @param {Function} callback - Callback function
   */
  onReportsChange(callback) {
    return this.stateManager.subscribe('financial_reports', callback);
  }

  /**
   * Subscribe ke perubahan snapshot laporan
   * @param {Function} callback - Callback function
   */
  onLaporanSnapshotChange(callback) {
    return this.stateManager.subscribe('laporan_totals_snapshot', callback);
  }

  /**
   * Subscribe ke perubahan data warga
   * @param {Function} callback - Callback function
   */
  onWargaDataChange(callback) {
    return this.stateManager.subscribe('warga_data', callback);
  }

  /**
   * Subscribe ke perubahan data iuran
   * @param {Function} callback - Callback function
   */
  onDuesDataChange(callback) {
    const unsubscribeConfigs = this.stateManager.subscribe('dues_configs', callback);
    const unsubscribePayments = this.stateManager.subscribe('dues_payments', callback);
    
    return () => {
      unsubscribeConfigs();
      unsubscribePayments();
    };
  }

  /**
   * Update data transaksi
   * @param {Array} transactions - Array of transactions
   */
  updateTransactions(transactions) {
    this.stateManager.updateState('financial_transactions_v2', transactions);
  }

  /**
   * Update data laporan
   * @param {Array} reports - Array of reports
   */
  updateReports(reports) {
    this.stateManager.updateState('financial_reports', reports);
  }

  /**
   * Update snapshot laporan
   * @param {Object} snapshot - Laporan snapshot
   */
  updateLaporanSnapshot(snapshot) {
    this.stateManager.updateState('laporan_totals_snapshot', snapshot);
  }

  /**
   * Update data warga
   * @param {Array} warga - Array of warga data
   */
  updateWargaData(warga) {
    this.stateManager.updateState('warga_data', warga);
  }

  /**
   * Update data iuran
   * @param {Object} configs - Dues configurations
   * @param {Array} payments - Dues payments
   */
  updateDuesData(configs, payments) {
    if (configs) {
      this.stateManager.updateState('dues_configs', configs);
    }
    if (payments) {
      this.stateManager.updateState('dues_payments', payments);
    }
  }

  /**
   * Get current transactions data
   */
  getTransactions() {
    return this.stateManager.getState('financial_transactions_v2', []);
  }

  /**
   * Get current reports data
   */
  getReports() {
    return this.stateManager.getState('financial_reports', []);
  }

  /**
   * Get current laporan snapshot
   */
  getLaporanSnapshot() {
    return this.stateManager.getState('laporan_totals_snapshot', null);
  }

  /**
   * Get current warga data
   */
  getWargaData() {
    return this.stateManager.getState('warga_data', []);
  }

  /**
   * Get current dues data
   */
  getDuesData() {
    return {
      configs: this.stateManager.getState('dues_configs', {}),
      payments: this.stateManager.getState('dues_payments', [])
    };
  }

  /**
   * Trigger chart data update event
   */
  triggerChartUpdate() {
    window.dispatchEvent(new CustomEvent('chart-data-updated'));
  }

  /**
   * Get sync status untuk debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      stateInfo: this.stateManager.getInfo(),
      financialData: {
        transactions: this.getTransactions().length,
        reports: this.getReports().length,
        warga: this.getWargaData().length,
        dues: Object.keys(this.getDuesData().configs).length
      }
    };
  }
}

// Global instance
window.financialDataSync = window.financialDataSync || new FinancialDataSync();

/**
 * Auto-initialize ketika DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize dengan delay untuk memastikan semua script sudah load
  setTimeout(() => {
    window.financialDataSync.init();
  }, 1000);
});

// Export untuk penggunaan di file lain
export default SharedStateManager;
export { SharedStateManager, FinancialDataSync };
