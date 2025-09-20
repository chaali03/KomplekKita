<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WargaController extends Controller
{
    protected $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    /**
     * Get list of Warga with pagination, search, and filters
     */
    public function index(Request $request)
    {
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 10);
        $search = $request->query('search');
        $komplekId = $request->query('komplek_id');
        $status = $request->query('status'); // e.g., 'aktif', 'pindah', 'meninggal'

        $query = [
            'select' => 'id,nik,kk,nama,jenis_kelamin,tempat_lahir,tanggal_lahir,agama,status_perkawinan,pekerjaan,alamat,rt,rw,telepon,email,status,komplek_id,created_at',
            'order' => 'created_at.desc',
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage
        ];

        // Apply filters
        if ($search) {
            $query['or'] = "(nama.ilike.%$search%,nik.ilike.%$search%,kk.ilike.%$search%,telepon.ilike.%$search%)";
        }
        
        if ($komplekId) {
            $query['komplek_id'] = 'eq.' . $komplekId;
        }
        
        if ($status) {
            $query['status'] = 'eq.' . $status;
        }

        try {
            $response = $this->supabase->query('warga', $query, true);
            
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
                'message' => 'Gagal mengambil data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new Warga
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nik' => 'required|string|max:16|unique:warga,nik',
            'kk' => 'required|string|max:16',
            'nama' => 'required|string|max:100',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => 'required|string|max:100',
            'tanggal_lahir' => 'required|date',
            'agama' => 'required|string|max:20',
            'status_perkawinan' => 'required|string|max:20',
            'pekerjaan' => 'required|string|max:100',
            'alamat' => 'required|string',
            'rt' => 'required|string|max:3',
            'rw' => 'required|string|max:3',
            'telepon' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'status' => 'required|in:aktif,pindah,meninggal',
            'komplek_id' => 'required|uuid|exists:komplek,id',
            'foto_ktp' => 'nullable|string', // Base64 or URL
            'foto_kk' => 'nullable|string',  // Base64 or URL
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
            $result = $this->supabase->insert('warga', $data);
            
            return response()->json([
                'success' => true,
                'message' => 'Data warga berhasil ditambahkan',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Warga detail by ID
     */
    public function show($id)
    {
        try {
            $warga = $this->supabase->find('warga', $id);
            
            if (!$warga) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data warga tidak ditemukan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $warga
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Warga
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nik' => 'sometimes|required|string|max:16|unique:warga,nik,' . $id,
            'kk' => 'sometimes|required|string|max:16',
            'nama' => 'sometimes|required|string|max:100',
            'jenis_kelamin' => 'sometimes|required|in:L,P',
            'tempat_lahir' => 'sometimes|required|string|max:100',
            'tanggal_lahir' => 'sometimes|required|date',
            'agama' => 'sometimes|required|string|max:20',
            'status_perkawinan' => 'sometimes|required|string|max:20',
            'pekerjaan' => 'sometimes|required|string|max:100',
            'alamat' => 'sometimes|required|string',
            'rt' => 'sometimes|required|string|max:3',
            'rw' => 'sometimes|required|string|max:3',
            'telepon' => 'sometimes|required|string|max:20',
            'email' => 'nullable|email|max:100',
            'status' => 'sometimes|required|in:aktif,pindah,meninggal',
            'komplek_id' => 'sometimes|required|uuid|exists:komplek,id',
            'foto_ktp' => 'nullable|string',
            'foto_kk' => 'nullable|string',
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
            $updated = $this->supabase->update('warga', $id, $data);
            
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengupdate data warga'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Data warga berhasil diupdate',
                'data' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete Warga
     */
    public function destroy($id)
    {
        try {
            // Check if warga has any transactions
            $transactions = $this->supabase->count('transactions', ['warga_id' => 'eq.' . $id]);
            
            if ($transactions > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus warga karena memiliki riwayat transaksi'
                ], 400);
            }

            $deleted = $this->supabase->delete('warga', $id);
            
            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus data warga'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Data warga berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Warga by KK (Kartu Keluarga)
     */
    public function byKk($kk)
    {
        try {
            $warga = $this->supabase->query('warga', [
                'kk' => 'eq.' . $kk,
                'order' => 'nama.asc'
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $warga
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import Warga from Excel/CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'komplek_id' => 'required|uuid|exists:komplek,id'
        ]);

        try {
            // Process the file using your import service
            // This is a simplified example
            $imported = [
                'total' => 0,
                'success' => 0,
                'failed' => 0,
                'errors' => []
            ];
            
            // TODO: Implement actual import logic
            
            return response()->json([
                'success' => true,
                'message' => 'Import data warga berhasil',
                'data' => $imported
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengimpor data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export Warga to Excel/PDF
     */
    public function export(Request $request)
    {
        $request->validate([
            'format' => 'required|in:excel,pdf',
            'komplek_id' => 'nullable|uuid|exists:komplek,id',
            'status' => 'nullable|in:aktif,pindah,meninggal'
        ]);

        try {
            // TODO: Implement export logic
            
            return response()->json([
                'success' => true,
                'message' => 'Export data warga berhasil',
                'url' => 'path/to/exported/file' // URL to download the exported file
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengekspor data warga',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
