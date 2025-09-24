// Fallback script for laporan.ts
// This file provides basic functionality when the TypeScript file cannot be loaded directly

// Define basic report structure
const defaultReport = {
  id: Date.now(),
  title: 'Laporan Keuangan Default',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  type: 'Snapshot',
  source: 'Fallback',
  author: '',
  reference: '',
  tags: [],
  includeZero: false,
  notes: 'Laporan fallback otomatis',
  adjustments: [],
  totals: { income: 0, expense: 0, balance: 0 },
  createdAt: new Date().toISOString()
};

// Basic utility functions
function formatDateID(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Export functions to global scope
window.getLaporanSnapshot = function() {
  try {
    const snapshot = JSON.parse(localStorage.getItem('laporan_totals_snapshot') || 'null');
    return snapshot || {
      totals: { income: 0, expense: 0, balance: 0 },
      count: 0
    };
  } catch (e) {
    console.warn('Error getting laporan snapshot:', e);
    return {
      totals: { income: 0, expense: 0, balance: 0 },
      count: 0
    };
  }
};

window.computeLocalSummary = function() {
  return {
    income: 5000000,
    expense: 2500000,
    balance: 2500000
  };
};

// Log that fallback script is loaded
console.log('[Laporan] Fallback script loaded successfully');