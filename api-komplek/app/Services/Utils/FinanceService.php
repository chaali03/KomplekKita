<?php

namespace App\Services\Utils;

class FinanceService
{
    protected $apiClient;
    
    public function __construct(ApiClientService $apiClient)
    {
        $this->apiClient = $apiClient;
    }
    
    /**
     * Menghitung total transaksi
     */
    public function calculateTotals($transactions)
    {
        $income = 0;
        $expense = 0;
        
        foreach ($transactions as $tx) {
            if ($tx['type'] === 'Masuk') {
                $income += (float)$tx['amount'];
            } elseif ($tx['type'] === 'Keluar') {
                $expense += (float)$tx['amount'];
            }
        }
        
        $balance = $income - $expense;
        $count = count($transactions);
        
        return [
            'income' => $income,
            'expense' => $expense,
            'balance' => $balance,
            'count' => $count
        ];
    }
    
    /**
     * Format angka ke format IDR
     */
    public function formatIDR($amount)
    {
        return 'Rp ' . number_format(round($amount), 0, ',', '.');
    }
    
    /**
     * Memuat transaksi dari database
     */
    public function loadTransactions($filters = [])
    {
        try {
            // Query database untuk mendapatkan transaksi
            $query = \DB::table('transactions');
            
            if (!empty($filters['start'])) {
                $query->where('date', '>=', $filters['start']);
            }
            
            if (!empty($filters['end'])) {
                $query->where('date', '<=', $filters['end']);
            }
            
            if (!empty($filters['search'])) {
                $query->where(function($q) use ($filters) {
                    $q->where('description', 'like', '%' . $filters['search'] . '%')
                      ->orWhere('category', 'like', '%' . $filters['search'] . '%');
                });
            }
            
            if (!empty($filters['category'])) {
                $query->where('category', $filters['category']);
            }
            
            if (!empty($filters['type'])) {
                $query->where('type', $filters['type']);
            }
            
            if (!empty($filters['minAmount'])) {
                $query->where('amount', '>=', $filters['minAmount']);
            }
            
            if (!empty($filters['maxAmount'])) {
                $query->where('amount', '<=', $filters['maxAmount']);
            }
            
            $transactions = $query->orderBy('date', 'desc')->get()->toArray();
            
            return $transactions;
        } catch (\Exception $e) {
            \Log::error('Failed to load transactions: ' . $e->getMessage());
            return [];
        }
    }
}