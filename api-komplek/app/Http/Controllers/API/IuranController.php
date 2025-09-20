<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class IuranController extends Controller
{
    protected $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    /**
     * Get list of Iuran with pagination, search, and filters
     */
    public function index(Request $request)
    {
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 10);
        $search = $request->query('search');
        $komplekId = $request->query('komplek_id');
        $status = $request->query('status');
        $tahun = $request->query('tahun');
        $bulan = $request->query('bulan');

        $query = [
            'select' => '*,komplek(nama as nama_komplek)',
            'order' => 'created_at.desc',
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage
        ];

        // Apply filters
        if ($search) {
            $query['or'] = "(nama.ilike.%$search%,keterangan.ilike.%$search%)";
        }
        
        if ($komplekId) {
            $query['komplek_id'] = 'eq.' . $komplekId;
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

        try {
            $response = $this->supabase->query('iuran', $query, true);
            
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
                'message' => 'Gagal mengambil data iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new Iuran
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'komplek_id' => 'required|uuid',  // Removed exists:komplek,id validation
            'nama' => 'required|string|max:100',
            'jenis' => 'required|in:rutin,khusus,sumbangan',
            'nominal' => 'required|numeric|min:0',
            'periode' => 'required|in:harian,mingguan,bulanan,tahunan,sekali',
            'tgl_jatuh_tempo' => 'required|date',
            'keterangan' => 'nullable|string',
            'status' => 'required|in:aktif,tidak_aktif',
            'wajib' => 'boolean',
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
            \Log::info('Mencoba menyimpan data iuran:', $data);
            
            $result = $this->supabase->insert('iuran', $data);
            \Log::info('Hasil penyimpanan:', (array) $result);
            
            return response()->json([
                'success' => true,
                'message' => 'Iuran berhasil ditambahkan',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Iuran detail by ID
     */
    public function show($id)
    {
        try {
            $iuran = $this->supabase->find('iuran', $id);
            
            if (!$iuran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data iuran tidak ditemukan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $iuran
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Iuran
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'sometimes|required|string|max:100',
            'jenis' => 'sometimes|required|in:rutin,khusus,sumbangan',
            'nominal' => 'sometimes|required|numeric|min:0',
            'periode' => 'sometimes|required|in:harian,mingguan,bulanan,tahunan,sekali',
            'tgl_jatuh_tempo' => 'sometimes|required|date',
            'keterangan' => 'nullable|string',
            'status' => 'sometimes|required|in:aktif,tidak_aktif',
            'wajib' => 'boolean',
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
            $updated = $this->supabase->update('iuran', $id, $data);
            
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengupdate iuran'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Iuran berhasil diupdate',
                'data' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete Iuran
     */
    public function destroy($id)
    {
        try {
            // Check if iuran has any transactions
            $transactions = $this->supabase->count('transactions', ['iuran_id' => 'eq.' . $id]);
            
            if ($transactions > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus iuran karena sudah ada transaksi yang terkait'
                ], 400);
            }

            $deleted = $this->supabase->delete('iuran', $id);
            
            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus iuran'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Iuran berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Iuran status summary
     */
    public function getStatus(Request $request)
    {
        $komplekId = $request->query('komplek_id');
        $tahun = $request->query('tahun', date('Y'));
        $bulan = $request->query('bulan', date('m'));

        try {
            $query = [
                'select' => 'status,count(*),sum(nominal) as total',
                'group' => 'status',
                'tahun' => 'eq.' . $tahun,
                'bulan' => 'eq.' . $bulan
            ];

            if ($komplekId) {
                $query['komplek_id'] = 'eq.' . $komplekId;
            }

            $result = $this->supabase->query('transactions', $query);
            
            $summary = [
                'total' => 0,
                'lunas' => 0,
                'belum_lunas' => 0,
                'terlambat' => 0,
                'total_nominal' => 0,
                'total_dibayar' => 0,
                'total_denda' => 0
            ];

            foreach ($result as $row) {
                $summary['total'] += (int)$row['count'];
                
                if ($row['status'] === 'lunas') {
                    $summary['lunas'] = (int)$row['count'];
                    $summary['total_dibayar'] += (float)($row['total'] ?? 0);
                } elseif ($row['status'] === 'belum_lunas') {
                    $summary['belum_lunas'] = (int)$row['count'];
                } elseif ($row['status'] === 'terlambat') {
                    $summary['terlambat'] = (int)$row['count'];
                }
                
                $summary['total_nominal'] += (float)($row['total'] ?? 0);
            }

            // Get total denda
            $dendaQuery = [
                'select' => 'sum(denda) as total_denda',
                'tahun' => 'eq.' . $tahun,
                'bulan' => 'eq.' . $bulan
            ];
            
            if ($komplekId) {
                $dendaQuery['komplek_id'] = 'eq.' . $komplekId;
            }
            
            $dendaResult = $this->supabase->query('transactions', $dendaQuery);
            $summary['total_denda'] = (float)($dendaResult[0]['total_denda'] ?? 0);

            return response()->json([
                'success' => true,
                'data' => $summary,
                'filter' => [
                    'tahun' => $tahun,
                    'bulan' => $bulan,
                    'komplek_id' => $komplekId
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil status iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Iuran by Komplek
     */
    public function byKomplek($komplekId)
    {
        try {
            $iuran = $this->supabase->query('iuran', [
                'komplek_id' => 'eq.' . $komplekId,
                'status' => 'eq.aktif',
                'order' => 'nama.asc'
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $iuran
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data iuran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Iuran by Warga
     */
    public function byWarga($wargaId, Request $request)
    {
        $tahun = $request->query('tahun', date('Y'));
        $status = $request->query('status'); // lunas, belum_lunas, terlambat

        try {
            $query = [
                'select' => 'transactions.*,iuran(nama as nama_iuran,jenis,periode)',
                'warga_id' => 'eq.' . $wargaId,
                'tahun' => 'eq.' . $tahun,
                'order' => 'bulan.desc,tanggal_bayar.desc'
            ];
            
            if ($status) {
                $query['status'] = 'eq.' . $status;
            }
            
            $transactions = $this->supabase->query('transactions', $query);
            
            return response()->json([
                'success' => true,
                'data' => $transactions,
                'meta' => [
                    'tahun' => $tahun,
                    'status' => $status
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data tagihan',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bayar Iuran
     */
    public function bayar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'iuran_id' => 'required|uuid|exists:iuran,id',
            'warga_id' => 'required|uuid|exists:warga,id',
            'nominal' => 'required|numeric|min:0',
            'denda' => 'nullable|numeric|min:0',
            'metode_bayar' => 'required|string|in:tunai,transfer,ewallet,qris',
            'keterangan' => 'nullable|string',
            'bukti_bayar' => 'nullable|string', // URL or base64
            'tanggal_bayar' => 'required|date',
            'tahun' => 'required|numeric|digits:4',
            'bulan' => 'required|numeric|between:1,12',
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
            
            // Check if already paid
            $existing = $this->supabase->query('transactions', [
                'iuran_id' => 'eq.' . $data['iuran_id'],
                'warga_id' => 'eq.' . $data['warga_id'],
                'tahun' => 'eq.' . $data['tahun'],
                'bulan' => 'eq.' . $data['bulan'],
                'limit' => 1
            ]);
            
            if (!empty($existing)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Iuran untuk periode ini sudah dibayar'
                ], 400);
            }
            
            // Determine status
            $data['status'] = 'lunas';
            if ($data['denda'] > 0) {
                $data['status'] = 'terlambat';
            }
            
            // Create transaction
            $transaction = $this->supabase->insert('transactions', $data);
            
            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil dicatat',
                'data' => $transaction
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan pembayaran',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update transaction status
     */
    public function updateStatus($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:lunas,belum_lunas,dibatalkan',
            'keterangan' => 'nullable|string'
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
            $updated = $this->supabase->update('transactions', $id, $data);
            
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengupdate status transaksi'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Status transaksi berhasil diupdate',
                'data' => $updated
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate status transaksi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate tagihan bulanan
     */
    public function generateTagihan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'komplek_id' => 'required|uuid|exists:komplek,id',
            'tahun' => 'required|numeric|digits:4',
            'bulan' => 'required|numeric|between:1,12',
            'force' => 'boolean'
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
            $komplekId = $data['komplek_id'];
            $tahun = $data['tahun'];
            $bulan = $data['bulan'];
            $force = $data['force'] ?? false;
            
            // Get all active iuran for this komplek
            $iurans = $this->supabase->query('iuran', [
                'komplek_id' => 'eq.' . $komplekId,
                'status' => 'eq.aktif',
                'select' => 'id,nominal,periode,denda_per_hari,max_denda'
            ]);
            
            if (empty($iurans)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada iuran aktif untuk komplek ini'
                ], 400);
            }
            
            // Get all warga in this komplek
            $wargas = $this->supabase->query('warga', [
                'komplek_id' => 'eq.' . $komplekId,
                'status' => 'eq.aktif',
                'select' => 'id'
            ]);
            
            if (empty($wargas)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada warga aktif di komplek ini'
                ], 400);
            }
            
            $generated = 0;
            $skipped = 0;
            $errors = [];
            
            // Generate transactions
            foreach ($iurans as $iuran) {
                foreach ($wargas as $warga) {
                    try {
                        // Check if already exists
                        if (!$force) {
                            $exists = $this->supabase->exists('transactions', [
                                'iuran_id' => 'eq.' . $iuran['id'],
                                'warga_id' => 'eq.' . $warga['id'],
                                'tahun' => 'eq.' . $tahun,
                                'bulan' => 'eq.' . $bulan
                            ]);
                            
                            if ($exists) {
                                $skipped++;
                                continue;
                            }
                        }
                        
                        // Create transaction
                        $transaction = [
                            'iuran_id' => $iuran['id'],
                            'warga_id' => $warga['id'],
                            'komplek_id' => $komplekId,
                            'nominal' => $iuran['nominal'],
                            'denda' => 0,
                            'status' => 'belum_lunas',
                            'tahun' => $tahun,
                            'bulan' => $bulan,
                            'metode_bayar' => null,
                            'tanggal_bayar' => null,
                            'keterangan' => 'Tagihan otomatis',
                            'denda_per_hari' => $iuran['denda_per_hari'] ?? 0,
                            'max_denda' => $iuran['max_denda'] ?? 0
                        ];
                        
                        $this->supabase->insert('transactions', $transaction);
                        $generated++;
                        
                    } catch (\Exception $e) {
                        $errors[] = [
                            'iuran_id' => $iuran['id'],
                            'warga_id' => $warga['id'],
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Generate tagihan berhasil',
                'data' => [
                    'generated' => $generated,
                    'skipped' => $skipped,
                    'errors' => $errors
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal generate tagihan',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
