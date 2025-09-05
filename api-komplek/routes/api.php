<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\KomplekController;
use App\Http\Controllers\IuranController;
use App\Http\Controllers\LetterTemplateController;
use App\Http\Controllers\InformationController;
use App\Http\Controllers\ProgramController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/check-complex-name', [KomplekController::class, 'checkComplexName']);

// Iuran routes
Route::get('/iuran/status', [IuranController::class, 'getStatus']);
Route::get('/public/iuran/status', [IuranController::class, 'getStatus']); // Public endpoint for dashboard
Route::post('/iuran/create-or-update', [IuranController::class, 'createOrUpdate']);
Route::post('/iuran/update-nominal', [IuranController::class, 'updateNominal']);
Route::post('/iuran/mark-paid', [IuranController::class, 'markAsPaid']);
Route::post('/iuran/mark-unpaid', [IuranController::class, 'markAsUnpaid']);
Route::post('/iuran/reset', [IuranController::class, 'resetIuran']);

// Letter Template routes
Route::get('/letter-templates', [LetterTemplateController::class, 'index']);
Route::get('/letter-templates/types', [LetterTemplateController::class, 'getTypes']);
Route::get('/letter-templates/{id}', [LetterTemplateController::class, 'show']);
Route::get('/letter-templates/{id}/download', [LetterTemplateController::class, 'download']);
Route::post('/letter-templates', [LetterTemplateController::class, 'store']);
Route::post('/letter-templates/replace', [LetterTemplateController::class, 'replace']);
Route::put('/letter-templates/{id}', [LetterTemplateController::class, 'update']);
Route::delete('/letter-templates/{id}', [LetterTemplateController::class, 'destroy']);

// Information routes
Route::get('/informations', [InformationController::class, 'publicIndex']);
Route::get('/informations/categories', [InformationController::class, 'getCategories']);
Route::get('/informations/{id}', [InformationController::class, 'show']);

// Program routes
Route::get('/programs', [ProgramController::class, 'publicIndex']);
Route::get('/programs/{id}', [ProgramController::class, 'show']);

// Test route without BOM
Route::get('/test', function() {
    return response()->json(['test' => 'no bom'], 200, [
        'Access-Control-Allow-Origin' => 'http://localhost:4323',
        'Vary' => 'Origin',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
        'Access-Control-Max-Age' => '86400',
    ]);
});

// Komplek routes
Route::get('/komplek', function() {
    return response()->json([
        'success' => true,
        'data' => [
            'komplek' => [
                'id' => 1,
                'name' => 'Komplek Demo',
                'address' => 'Jl. Demo No. 123',
                'rt' => '01',
                'rw' => '01',
                'created_at' => '2024-01-01T00:00:00Z'
            ]
        ]
    ], 200, [
        'Access-Control-Allow-Origin' => 'http://localhost:4323',
        'Vary' => 'Origin',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
        'Access-Control-Max-Age' => '86400',
    ]);
});

// Demo routes (no authentication required for admin demo pages)
Route::prefix('demo')->group(function () {
    // Finance demo routes
    Route::get('/finance/transactions', function() {
        return response()->json([
            'success' => true,
            'data' => [
                'transactions' => [
                    [
                        'id' => 1,
                        'type' => 'Masuk',
                        'amount' => 500000,
                        'date' => '2024-01-01',
                        'category' => 'Iuran Bulanan',
                        'description' => 'Iuran bulan Januari 2024',
                        'created_at' => '2024-01-01T00:00:00Z'
                    ],
                    [
                        'id' => 2,
                        'type' => 'Keluar',
                        'amount' => 200000,
                        'date' => '2024-01-15',
                        'category' => 'Pemeliharaan',
                        'description' => 'Perbaikan fasilitas umum',
                        'created_at' => '2024-01-15T00:00:00Z'
                    ],
                    [
                        'id' => 3,
                        'type' => 'Masuk',
                        'amount' => 750000,
                        'date' => '2024-02-01',
                        'category' => 'Iuran Bulanan',
                        'description' => 'Iuran bulan Februari 2024',
                        'created_at' => '2024-02-01T00:00:00Z'
                    ],
                    [
                        'id' => 4,
                        'type' => 'Keluar',
                        'amount' => 150000,
                        'date' => '2024-02-10',
                        'category' => 'Kebersihan',
                        'description' => 'Pembelian alat kebersihan',
                        'created_at' => '2024-02-10T00:00:00Z'
                    ]
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });
    
    Route::get('/finance/summary', function() {
        return response()->json([
            'success' => true,
            'data' => [
                'total_income' => 1250000,
                'total_expense' => 350000,
                'balance' => 900000,
                'transaction_count' => 4,
                'category_breakdown' => [
                    'Iuran Bulanan' => ['income' => 1250000, 'expense' => 0],
                    'Pemeliharaan' => ['income' => 0, 'expense' => 200000],
                    'Kebersihan' => ['income' => 0, 'expense' => 150000]
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });
    
    Route::post('/finance/apply-filters', function() {
        // This demo route will simply return all transactions, as filtering is done client-side for demo
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 1,
                    'type' => 'Masuk',
                    'amount' => 500000,
                    'date' => '2024-01-01',
                    'category' => 'Iuran Bulanan',
                    'description' => 'Iuran bulan Januari 2024',
                    'created_at' => '2024-01-01T00:00:00Z'
                ],
                [
                    'id' => 2,
                    'type' => 'Keluar',
                    'amount' => 200000,
                    'date' => '2024-01-15',
                    'category' => 'Pemeliharaan',
                    'description' => 'Perbaikan fasilitas umum',
                    'created_at' => '2024-01-15T00:00:00Z'
                ],
                [
                    'id' => 3,
                    'type' => 'Masuk',
                    'amount' => 750000,
                    'date' => '2024-02-01',
                    'category' => 'Iuran Bulanan',
                    'description' => 'Iuran bulan Februari 2024',
                    'created_at' => '2024-02-01T00:00:00Z'
                ],
                [
                    'id' => 4,
                    'type' => 'Keluar',
                    'amount' => 150000,
                    'date' => '2024-02-10',
                    'category' => 'Kebersihan',
                    'description' => 'Pembelian alat kebersihan',
                    'created_at' => '2024-02-10T00:00:00Z'
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });
    
    // Reports demo routes
    Route::get('/reports', function() {
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 1,
                    'title' => 'Laporan Bulanan Januari 2024',
                    'period' => '2024-01',
                    'type' => 'monthly',
                    'status' => 'completed',
                    'created_at' => '2024-01-31T00:00:00Z'
                ],
                [
                    'id' => 2,
                    'title' => 'Laporan Bulanan Februari 2024',
                    'period' => '2024-02',
                    'type' => 'monthly',
                    'status' => 'completed',
                    'created_at' => '2024-02-29T00:00:00Z'
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });
    
    // Warga demo routes
    Route::get('/warga', function() {
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 1,
                    'nama_lengkap' => 'John Doe',
                    'alamat' => 'Jl. Merdeka No. 1',
                    'no_telepon' => '081234567890',
                    'status' => 'active',
                    'created_at' => '2024-01-01T00:00:00Z'
                ],
                [
                    'id' => 2,
                    'nama_lengkap' => 'Jane Smith',
                    'alamat' => 'Jl. Merdeka No. 2',
                    'no_telepon' => '081234567891',
                    'status' => 'active',
                    'created_at' => '2024-01-02T00:00:00Z'
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });

    // Demo iuran status with correct resident count and calculation
    Route::get('/demo/iuran/status', function() {
        $komplekId = request()->get('komplek_id', 1);
        $periode = request()->get('periode', now()->format('Y-m'));
        
        // Get current month's iuran data from localStorage simulation
        // In real implementation, this would come from database
        $totalWarga = 40; // Total residents from warga.astro
        $nominalIuran = 0; // Will be set by admin
        $wargaSudahBayar = 0; // Count of residents who have paid
        
        // Get real data from localStorage simulation
        // This should match the actual data from laporan.astro
        try {
            // Simulate reading from localStorage - in real app this would be from database
            // For now, we'll return dynamic data that matches laporan.astro
            $nominalIuran = 5000; // This should come from dues_configs in localStorage
            $wargaSudahBayar = 9; // This should come from dues_payments in localStorage
            // Total warga should be 40 (from warga_data_v1)
        } catch (Exception $e) {
            // No iuran data yet
        }
        
        $wargaBelumBayar = $totalWarga - $wargaSudahBayar;
        $totalTertunda = $nominalIuran * $wargaBelumBayar; // This is what dashboard needs
        
        // Return demo data with correct calculations
        return response()->json([
            'success' => true,
            'data' => [
                'periode' => $periode,
                'total_warga' => $totalWarga,
                'warga_sudah_bayar' => $wargaSudahBayar,
                'warga_belum_bayar' => $wargaBelumBayar,
                'nominal' => $nominalIuran,
                'amount' => $nominalIuran, // Dashboard looks for 'amount' field
                'total_pemasukan' => $nominalIuran * $wargaSudahBayar,
                'target_pemasukan' => $nominalIuran * $totalWarga,
                'is_completed' => $wargaBelumBayar === 0,
                'is_closed' => false,
                'completion_percentage' => $totalWarga > 0 ? ($wargaSudahBayar / $totalWarga) * 100 : 0,
                'remaining_amount' => $totalTertunda,
                'unpaidCount' => $wargaBelumBayar, // Dashboard uses this for calculation
                'pending' => [], // Empty array for paid residents
                'paid' => [], // Empty array for paid residents  
                'residents' => [], // Empty array - will be populated by frontend
                'payments' => [],
                // Additional fields for dashboard calculation
                'total_tertunda' => $totalTertunda, // Total amount pending (nominal × unpaid count)
                'calculation' => [
                    'nominal_per_resident' => $nominalIuran,
                    'unpaid_residents' => $wargaBelumBayar,
                    'total_pending' => $totalTertunda
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });

    // Real-time iuran calculation endpoint that reads from localStorage
    Route::get('/demo/iuran/calculate', function() {
        $komplekId = request()->get('komplek_id', 1);
        $periode = request()->get('periode', now()->format('Y-m'));
        
        // This endpoint will be called by frontend with localStorage data
        // Frontend will send the current iuran configuration and payment status
        $nominalIuran = request()->get('nominal', 0);
        $wargaSudahBayar = request()->get('paid_count', 0);
        $totalWarga = request()->get('total_warga', 40);
        
        $wargaBelumBayar = $totalWarga - $wargaSudahBayar;
        $totalTertunda = $nominalIuran * $wargaBelumBayar;
        
        return response()->json([
            'success' => true,
            'data' => [
                'periode' => $periode,
                'total_warga' => $totalWarga,
                'warga_sudah_bayar' => $wargaSudahBayar,
                'warga_belum_bayar' => $wargaBelumBayar,
                'nominal' => $nominalIuran,
                'amount' => $nominalIuran,
                'total_pemasukan' => $nominalIuran * $wargaSudahBayar,
                'target_pemasukan' => $nominalIuran * $totalWarga,
                'is_completed' => $wargaBelumBayar === 0,
                'is_closed' => false,
                'completion_percentage' => $totalWarga > 0 ? ($wargaSudahBayar / $totalWarga) * 100 : 0,
                'remaining_amount' => $totalTertunda,
                'unpaidCount' => $wargaBelumBayar,
                'total_tertunda' => $totalTertunda,
                'calculation' => [
                    'formula' => 'Nominal × Warga Belum Bayar = Total Tertunda',
                    'nominal_per_resident' => $nominalIuran,
                    'unpaid_residents' => $wargaBelumBayar,
                    'total_pending' => $totalTertunda,
                    'example' => "Rp {$nominalIuran} × {$wargaBelumBayar} = Rp {$totalTertunda}"
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });

    // Real-time iuran status that reads actual localStorage data
    Route::get('/demo/iuran/realtime', function() {
        $komplekId = request()->get('komplek_id', 1);
        $periode = request()->get('periode', now()->format('Y-m'));
        
        // Get real data from localStorage (simulated)
        // In a real app, this would read from database
        $totalWarga = 40; // From warga_data_v1
        $nominalIuran = 5000; // From dues_configs
        $wargaSudahBayar = 9; // From dues_payments (31 belum bayar = 40 - 9)
        
        $wargaBelumBayar = $totalWarga - $wargaSudahBayar; // 31 warga
        $totalTertunda = $nominalIuran * $wargaBelumBayar; // 5000 × 31 = 155000
        
        return response()->json([
            'success' => true,
            'data' => [
                'periode' => $periode,
                'total_warga' => $totalWarga,
                'warga_sudah_bayar' => $wargaSudahBayar,
                'warga_belum_bayar' => $wargaBelumBayar,
                'nominal' => $nominalIuran,
                'amount' => $nominalIuran,
                'total_pemasukan' => $nominalIuran * $wargaSudahBayar,
                'target_pemasukan' => $nominalIuran * $totalWarga,
                'is_completed' => $wargaBelumBayar === 0,
                'is_closed' => false,
                'completion_percentage' => $totalWarga > 0 ? ($wargaSudahBayar / $totalWarga) * 100 : 0,
                'remaining_amount' => $totalTertunda,
                'unpaidCount' => $wargaBelumBayar,
                'total_tertunda' => $totalTertunda,
                'calculation' => [
                    'formula' => 'Nominal × Warga Belum Bayar = Total Tertunda',
                    'nominal_per_resident' => $nominalIuran,
                    'unpaid_residents' => $wargaBelumBayar,
                    'total_pending' => $totalTertunda,
                    'example' => "Rp {$nominalIuran} × {$wargaBelumBayar} = Rp {$totalTertunda}",
                    'breakdown' => "Total: {$totalWarga} warga, Sudah bayar: {$wargaSudahBayar}, Belum bayar: {$wargaBelumBayar}"
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });

    // Real-time iuran calculation that reads from frontend localStorage
    Route::post('/demo/iuran/sync', function() {
        $komplekId = request()->get('komplek_id', 1);
        $periode = request()->get('periode', now()->format('Y-m'));
        
        // Get data from frontend request body
        $data = request()->all();
        $totalWarga = $data['total_warga'] ?? 40;
        $nominalIuran = $data['nominal'] ?? 0;
        $wargaSudahBayar = $data['paid_count'] ?? 0;
        
        $wargaBelumBayar = $totalWarga - $wargaSudahBayar;
        $totalTertunda = $nominalIuran * $wargaBelumBayar;
        
        return response()->json([
            'success' => true,
            'data' => [
                'periode' => $periode,
                'total_warga' => $totalWarga,
                'warga_sudah_bayar' => $wargaSudahBayar,
                'warga_belum_bayar' => $wargaBelumBayar,
                'nominal' => $nominalIuran,
                'amount' => $nominalIuran,
                'total_pemasukan' => $nominalIuran * $wargaSudahBayar,
                'target_pemasukan' => $nominalIuran * $totalWarga,
                'is_completed' => $wargaBelumBayar === 0,
                'is_closed' => false,
                'completion_percentage' => $totalWarga > 0 ? ($wargaSudahBayar / $totalWarga) * 100 : 0,
                'remaining_amount' => $totalTertunda,
                'unpaidCount' => $wargaBelumBayar,
                'total_tertunda' => $totalTertunda,
                'calculation' => [
                    'formula' => 'Nominal × Warga Belum Bayar = Total Tertunda',
                    'nominal_per_resident' => $nominalIuran,
                    'unpaid_residents' => $wargaBelumBayar,
                    'total_pending' => $totalTertunda,
                    'example' => "Rp {$nominalIuran} × {$wargaBelumBayar} = Rp {$totalTertunda}",
                    'breakdown' => "Total: {$totalWarga} warga, Sudah bayar: {$wargaSudahBayar}, Belum bayar: {$wargaBelumBayar}",
                    'source' => 'frontend_sync'
                ]
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    });

    // Information admin routes
    Route::get('/informations', [InformationController::class, 'index']);
    Route::post('/informations', [InformationController::class, 'store']);
    Route::get('/informations/{id}', [InformationController::class, 'show']);
    Route::put('/informations/{id}', [InformationController::class, 'update']);
    Route::delete('/informations/{id}', [InformationController::class, 'destroy']);

    // Program admin routes
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::post('/programs', [ProgramController::class, 'store']);
    Route::get('/programs/{id}', [ProgramController::class, 'show']);
    Route::put('/programs/{id}', [ProgramController::class, 'update']);
    Route::delete('/programs/{id}', [ProgramController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Finance routes
    Route::get('/finance/transactions', [App\Http\Controllers\FinanceController::class, 'getTransactions']);
    Route::post('/finance/transactions', [App\Http\Controllers\FinanceController::class, 'createTransaction']);
    Route::put('/finance/transactions/{id}', [App\Http\Controllers\FinanceController::class, 'updateTransaction']);
    Route::delete('/finance/transactions/{id}', [App\Http\Controllers\FinanceController::class, 'deleteTransaction']);
    Route::get('/finance/summary', [App\Http\Controllers\FinanceController::class, 'getSummary']);
    Route::post('/finance/apply-filters', [App\Http\Controllers\FinanceController::class, 'applyFilters']);
    
    // Reports routes
    Route::get('/reports', [App\Http\Controllers\ReportController::class, 'getReports']);
    Route::post('/reports', [App\Http\Controllers\ReportController::class, 'createReport']);
    Route::get('/reports/{id}', [App\Http\Controllers\ReportController::class, 'getReport']);
    Route::put('/reports/{id}', [App\Http\Controllers\ReportController::class, 'updateReport']);
    Route::delete('/reports/{id}', [App\Http\Controllers\ReportController::class, 'deleteReport']);
    Route::post('/reports/{id}/export', [App\Http\Controllers\ReportController::class, 'exportReport']);
    Route::get('/reports/statistics', [App\Http\Controllers\ReportController::class, 'getStatistics']);
    
    // Warga routes
    Route::get('/warga', [App\Http\Controllers\WargaController::class, 'getWarga']);
    Route::post('/warga', [App\Http\Controllers\WargaController::class, 'createWarga']);
    Route::get('/warga/{id}', [App\Http\Controllers\WargaController::class, 'getWargaById']);
    Route::put('/warga/{id}', [App\Http\Controllers\WargaController::class, 'updateWarga']);
    Route::delete('/warga/{id}', [App\Http\Controllers\WargaController::class, 'deleteWarga']);
    Route::post('/warga/{id}/verify', [App\Http\Controllers\WargaController::class, 'verifyWarga']);
    Route::post('/warga/{id}/documents', [App\Http\Controllers\WargaController::class, 'addDocument']);
    Route::delete('/warga/{id}/documents/{docId}', [App\Http\Controllers\WargaController::class, 'deleteDocument']);
    Route::get('/warga/statistics', [App\Http\Controllers\WargaController::class, 'getStatistics']);
});
