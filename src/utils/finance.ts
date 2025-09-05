// Shared finance utilities for KPI parity across pages
// Updated to use PHP API instead of localStorage

import { apiClient } from './api-client';

export type TxType = 'Masuk' | 'Keluar';

// Generic transaction-like shape; only type and amount are required for totals
export type TxLike = {
  type: TxType | string;
  amount: number;
  date?: string;
  category?: string;
  description?: string;
};

export function calculateTotals<T extends TxLike>(rows: T[]) {
  const income = rows.filter(t => String(t.type) === 'Masuk').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = rows.filter(t => String(t.type) === 'Keluar').reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = income - expense;
  const count = rows.length;
  return { income, expense, balance, count };
}

export function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(amount || 0));
}

// Load transactions from API
export async function loadTransactions(filters: FilterOptions = {}) {
  try {
    const response = await apiClient.getTransactions(filters);
    if (response.success && response.data?.transactions) {
      return response.data.transactions;
    }
    return [];
  } catch (error) {
    console.warn('Failed to load transactions from API:', error);
    return [];
  }
}

// Shared filtering interface and utilities
export interface FilterOptions {
  start?: string;
  end?: string;
  search?: string;
  category?: string;
  type?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Unified filtering function that both pages can use
export async function applyFilters<T extends TxLike & { date?: string; category?: string; description?: string }>(transactions: T[], filters: FilterOptions): Promise<T[]> {
  try {
    // Use API filtering for better performance
    const response = await apiClient.applyFilters(transactions, filters);
    if (response.success && response.data?.transactions) {
      return response.data.transactions;
    }
    
    // Fallback to client-side filtering
    return applyFiltersClientSide(transactions, filters);
  } catch (error) {
    console.warn('API filtering failed, using client-side filtering:', error);
    return applyFiltersClientSide(transactions, filters);
  }
}

// Synchronous version for immediate use (used by laporan.ts)
export function applyFiltersSync<T extends TxLike & { date?: string; category?: string; description?: string }>(transactions: T[], filters: FilterOptions): T[] {
  return applyFiltersClientSide(transactions, filters);
}

// Client-side filtering as fallback
function applyFiltersClientSide<T extends TxLike & { date?: string; category?: string; description?: string }>(transactions: T[], filters: FilterOptions): T[] {
  let filtered = transactions.slice();
  
  // Date range filtering
  if (filters.start) {
    filtered = filtered.filter(t => t.date && t.date >= filters.start!);
  }
  if (filters.end) {
    filtered = filtered.filter(t => t.date && t.date <= filters.end!);
  }
  
  // Category filtering
  if (filters.category && filters.category !== 'Semua') {
    filtered = filtered.filter(t => t.category === filters.category);
  }
  
  // Type filtering
  if (filters.type && filters.type !== 'Semua') {
    filtered = filtered.filter(t => String(t.type) === filters.type);
  }
  
  // Search filtering
  if (filters.search) {
    const search = filters.search.toLowerCase().trim();
    filtered = filtered.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const type = String(t.type || '').toLowerCase();
      return desc.includes(search) || cat.includes(search) || type.includes(search);
    });
  }
  
  // Amount range filtering
  if (filters.minAmount && filters.minAmount > 0) {
    filtered = filtered.filter(t => t.amount >= filters.minAmount!);
  }
  if (filters.maxAmount && filters.maxAmount > 0) {
    filtered = filtered.filter(t => t.amount <= filters.maxAmount!);
  }
  
  return filtered;
}
