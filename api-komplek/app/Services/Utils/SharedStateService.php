<?php

namespace App\Services\Utils;

class SharedStateService
{
    /**
     * Get financial data sync
     * 
     * @param int $komplekId
     * @return array
     */
    public function getFinancialDataSync(int $komplekId): array
    {
        // Implementasi logika untuk mengambil data keuangan dari database
        return [
            'lastUpdate' => date('Y-m-d H:i:s'),
            'data' => $this->getFinancialData($komplekId)
        ];
    }
    
    /**
     * Get financial data
     * 
     * @param int $komplekId
     * @return array
     */
    private function getFinancialData(int $komplekId): array
    {
        // Implementasi logika untuk mengambil data keuangan dari database
        return [
            'balance' => 10000000,
            'income' => 5000000,
            'expense' => 3000000,
            'transactions' => []
        ];
    }
    
    /**
     * Get user state
     * 
     * @param int $userId
     * @return array
     */
    public function getUserState(int $userId): array
    {
        // Implementasi logika untuk mengambil data pengguna dari database
        return [
            'lastLogin' => date('Y-m-d H:i:s'),
            'notifications' => 5,
            'pendingTasks' => 3
        ];
    }
    
    /**
     * Get komplek state
     * 
     * @param int $komplekId
     * @return array
     */
    public function getKomplekState(int $komplekId): array
    {
        // Implementasi logika untuk mengambil data kompleks dari database
        return [
            'totalWarga' => 100,
            'activeWarga' => 90,
            'pendingIuran' => 10
        ];
    }
}