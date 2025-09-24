<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    protected $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    /**
     * Get list of transactions with pagination and filters
     */
    public function index(Request $request)
    {
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 10);
        $search = $request->query('search');
        $komplekId = $request->query('komplek_id');
        $iuranId = $request->query('iuran_id');
        $wargaId = $request->query('warga_id');
        $status = $request->query('status');
        $tahun = $request->query('tahun');
        $bulan = $request->query('bulan');
        $metodeBayar = $request->query('metode_bayar');

        $query = [
            'select' => '*,iuran(nama as nama_iuran, jenis, periode),warga(nama as nama_warga, nik, kk)',
            'order' => 'created_at.desc',
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage
        ];

        // Apply filters
        if ($search) {
            $query['or'] = "(keterangan.ilike.%$search%,no_transaksi.ilike.%$search%)";
        }
        
        if ($komplekId) {
            $query['komplek_id'] = 'eq.' . $komplekId;
        }
        
        if ($iuranId) {
            $query['iuran_id'] = 'eq.' . $iuranId;
        }
        
        if ($wargaId) {
            $query['warga_id'] = 'eq.' . $wargaId;
        }
        
        if ($status) {
            $query['status'] = 'eq.' . $status;
        }
        
        if ($tahun) {
            $query['tahun'] = 'eq.' . $tahun;
        }
        
        if ($bulan) {
            $query['bulan'] = 'eq.' . $bulan;
        }
        
        if ($metodeBayar) {
            $query['metode_bayar'] = 'eq.' . $metodeBayar;
        }

        try {
            $response = $this->supabase->query('transactions', $query, true);
            
            return response()->json([
                'success' => true,
                'data' => $response['data'] ?? [],
                'meta' => [
                    'current_page' => (int)$page,
                    'per_page' => (int)$perPage,
                    'total' => $response['count'] ?? 0
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction detail by ID
     */
    public function show($id)
    {
        try {
            $transaction = $this->supabase->find('transactions', $id, '*,iuran(*),warga(*,komplek(nama as nama_komplek))');
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaksi tidak ditemukan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update transaction
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nominal' => 'sometimes|required|numeric|min:0',
            'denda' => 'nullable|numeric|min:0',
            'status' => 'sometimes|required|in:lunas,belum_lunas,terlambat,dibatalkan',
            'metode_bayar' => 'nullable|string|in:tunai,transfer,ewallet,qris',
            'tanggal_bayar' => 'nullable|date',
            'keterangan' => 'nullable|string',
            'bukti_bayar' => 'nullable|string',
            'denda_per_hari' => 'nullable|numeric|min:0',
            'max_denda' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $validator->validated();
            
            // If updating status to lunas and no payment date, set to now
            if (isset($data['status']) && $data['status'] === 'lunas' && empty($data['tanggal_bayar'])) {
                $data['tanggal_bayar'] = now()->toDateTimeString();
            }
            
            $updated = $this->supabase->update('transactions', $id, $data);
            
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengupdate transaksi'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil diupdate',
                'data' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete transaction
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->supabase->delete('transactions', $id);
            
            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus transaksi'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction summary
     */
    public function summary(Request $request)
    {
        $komplekId = $request->query('komplek_id');
        $tahun = $request->query('tahun', date('Y'));
        $bulan = $request->query('bulan');
        $iuranId = $request->query('iuran_id');

        try {
            // Total transactions
            $totalQuery = [
                'select' => 'count(*),sum(nominal) as total_nominal,sum(denda) as total_denda',
                'tahun' => 'eq.' . $tahun,
            ];
            
            if ($komplekId) {
                $totalQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            if ($bulan) {
                $totalQuery['bulan'] = 'eq.' . $bulan;
            }
            
            if ($iuranId) {
                $totalQuery['iuran_id'] = 'eq.' . $iuranId;
            }
            
            $totalResult = $this->supabase->query('transactions', $totalQuery);
            $total = $totalResult[0] ?? [
                'count' => 0,
                'total_nominal' => 0,
                'total_denda' => 0
            ];
            
            // Transactions by status
            $statusQuery = [
                'select' => 'status,count(*),sum(nominal) as total',
                'group' => 'status',
                'tahun' => 'eq.' . $tahun,
            ];
            
            if ($komplekId) {
                $statusQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            if ($bulan) {
                $statusQuery['bulan'] = 'eq.' . $bulan;
            }
            
            if ($iuranId) {
                $statusQuery['iuran_id'] = 'eq.' . $iuranId;
            }
            
            $statusResult = $this->supabase->query('transactions', $statusQuery);
            
            // Transactions by payment method
            $methodQuery = [
                'select' => 'metode_bayar,count(*),sum(nominal) as total',
                'group' => 'metode_bayar',
                'tahun' => 'eq.' . $tahun,
                'status' => 'eq.lunas'
            ];
            
            if ($komplekId) {
                $methodQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            if ($bulan) {
                $methodQuery['bulan'] = 'eq.' . $bulan;
            }
            
            if ($iuranId) {
                $methodQuery['iuran_id'] = 'eq.' . $iuranId;
            }
            
            $methodResult = $this->supabase->query('transactions', $methodQuery);
            
            // Monthly summary for the year
            $monthlyQuery = [
                'select' => 'bulan,count(*),sum(nominal) as total',
                'group' => 'bulan',
                'tahun' => 'eq.' . $tahun,
                'status' => 'eq.lunas',
                'order' => 'bulan.asc'
            ];
            
            if ($komplekId) {
                $monthlyQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            if ($iuranId) {
                $monthlyQuery['iuran_id'] = 'eq.' . $iuranId;
            }
            
            $monthlyResult = $this->supabase->query('transactions', $monthlyQuery);
            
            // Format monthly data
            $monthlyData = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyData[$i] = [
                    'bulan' => $i,
                    'count' => 0,
                    'total' => 0
                ];
            }
            
            foreach ($monthlyResult as $item) {
                $monthlyData[(int)$item['bulan']] = [
                    'bulan' => (int)$item['bulan'],
                    'count' => (int)$item['count'],
                    'total' => (float)($item['total'] ?? 0)
                ];
            }
            
            // Recent transactions
            $recentQuery = [
                'select' => '*,iuran(nama as nama_iuran),warga(nama as nama_warga)',
                'order' => 'created_at.desc',
                'limit' => 5
            ];
            
            if ($komplekId) {
                $recentQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            if ($iuranId) {
                $recentQuery['iuran_id'] = 'eq.' . $iuranId;
            }
            
            $recentTransactions = $this->supabase->query('transactions', $recentQuery);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total' => [
                        'count' => (int)($total['count'] ?? 0),
                        'nominal' => (float)($total['total_nominal'] ?? 0),
                        'denda' => (float)($total['total_denda'] ?? 0),
                        'total' => (float)($total['total_nominal'] ?? 0) + (float)($total['total_denda'] ?? 0)
                    ],
                    'by_status' => $statusResult,
                    'by_method' => $methodResult,
                    'monthly' => array_values($monthlyData),
                    'recent' => $recentTransactions
                ],
                'filter' => [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'komplek_id' => $komplekId,
                    'iuran_id' => $iuranId
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil ringkasan transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export transactions to Excel/PDF
     */
    public function export(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'format' => 'required|in:excel,pdf',
            'komplek_id' => 'nullable|uuid|exists:komplek,id',
            'iuran_id' => 'nullable|uuid|exists:iuran,id',
            'status' => 'nullable|in:lunas,belum_lunas,terlambat,dibatalkan',
            'tahun' => 'nullable|numeric|digits:4',
            'bulan' => 'nullable|numeric|between:1,12',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // TODO: Implement export logic
            // This is a placeholder for the actual export implementation
            
            return response()->json([
                'success' => true,
                'message' => 'Export data transaksi berhasil',
                'url' => 'path/to/exported/file' // URL to download the exported file
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengekspor data transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
