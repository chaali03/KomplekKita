<?php

namespace App\Services\Utils;

class ApiMockService
{
    /**
     * Generate mock data for demo purposes
     */
    public function generateMockData($type, $params = [])
    {
        switch ($type) {
            case 'transactions':
                return $this->generateMockTransactions($params);
            case 'users':
                return $this->generateMockUsers($params);
            case 'reports':
                return $this->generateMockReports($params);
            default:
                return [];
        }
    }
    
    /**
     * Generate mock transactions
     */
    private function generateMockTransactions($params = [])
    {
        $count = $params['count'] ?? 20;
        $transactions = [];
        
        $categories = ['Iuran Bulanan', 'Sumbangan', 'Kebersihan', 'Keamanan', 'Perbaikan', 'Lain-lain'];
        
        for ($i = 0; $i < $count; $i++) {
            $type = rand(0, 1) ? 'Masuk' : 'Keluar';
            $amount = rand(50000, 2000000);
            $date = date('Y-m-d', strtotime('-' . rand(0, 30) . ' days'));
            
            $transactions[] = [
                'id' => uniqid(),
                'type' => $type,
                'amount' => $amount,
                'date' => $date,
                'category' => $categories[array_rand($categories)],
                'description' => 'Transaksi demo #' . ($i + 1),
                'created_at' => $date . ' ' . date('H:i:s'),
                'updated_at' => $date . ' ' . date('H:i:s')
            ];
        }
        
        return $transactions;
    }
    
    /**
     * Generate mock users
     */
    private function generateMockUsers($params = [])
    {
        $count = $params['count'] ?? 10;
        $users = [];
        
        $firstNames = ['Budi', 'Siti', 'Agus', 'Dewi', 'Joko', 'Ani', 'Bambang', 'Rina', 'Dodi', 'Lina'];
        $lastNames = ['Santoso', 'Wijaya', 'Kusuma', 'Susanto', 'Hartono', 'Gunawan', 'Setiawan', 'Hidayat', 'Nugroho', 'Suryadi'];
        
        for ($i = 0; $i < $count; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            
            $users[] = [
                'id' => $i + 1,
                'name' => $firstName . ' ' . $lastName,
                'email' => strtolower($firstName) . '.' . strtolower($lastName) . '@example.com',
                'phone' => '08' . rand(10000000, 99999999),
                'address' => 'Jl. Contoh No. ' . rand(1, 100),
                'created_at' => date('Y-m-d H:i:s', strtotime('-' . rand(0, 365) . ' days')),
                'updated_at' => date('Y-m-d H:i:s')
            ];
        }
        
        return $users;
    }
    
    /**
     * Generate mock reports
     */
    private function generateMockReports($params = [])
    {
        $months = $params['months'] ?? 6;
        $reports = [];
        
        for ($i = 0; $i < $months; $i++) {
            $month = date('Y-m', strtotime('-' . $i . ' months'));
            $income = rand(5000000, 15000000);
            $expense = rand(3000000, 10000000);
            
            $reports[] = [
                'month' => $month,
                'income' => $income,
                'expense' => $expense,
                'balance' => $income - $expense,
                'transactions_count' => rand(10, 50)
            ];
        }
        
        return $reports;
    }
}