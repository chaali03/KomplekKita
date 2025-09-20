<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KomplekController extends Controller
{
    protected $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    /**
     * Get list of Komplek with pagination and search
     */
    public function index(Request $request)
    {
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 10);
        $search = $request->query('search');

        $query = [
            'select' => 'id,nama,alamat,created_at',
            'order' => 'created_at.desc',
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage
        ];

        if ($search) {
            $query['or'] = "(nama.ilike.%$search%,alamat.ilike.%$search%)";
        }

        try {
            $response = $this->supabase->query('komplek', $query);
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
                'message' => 'Gagal mengambil data komplek',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new Komplek
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'alamat' => 'required|string',
            'kode_pos' => 'nullable|string|max:10',
            'rt' => 'nullable|string|max:3',
            'rw' => 'nullable|string|max:3',
            'kelurahan' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'telepon' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
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
            $result = $this->supabase->insert('komplek', $data);
            
            return response()->json([
                'success' => true,
                'message' => 'Komplek berhasil ditambahkan',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan komplek',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Komplek detail by ID
     */
    public function show($id)
    {
        try {
            $komplek = $this->supabase->find('komplek', $id);
            
            if (!$komplek) {
                return response()->json([
                    'success' => false,
                    'message' => 'Komplek tidak ditemukan'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $komplek
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail komplek',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Komplek
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'sometimes|required|string|max:255',
            'alamat' => 'sometimes|required|string',
            'kode_pos' => 'nullable|string|max:10',
            'rt' => 'nullable|string|max:3',
            'rw' => 'nullable|string|max:3',
            'kelurahan' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'telepon' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
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
            $updated = $this->supabase->update('komplek', $id, $data);
            
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengupdate komplek'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Komplek berhasil diupdate',
                'data' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate komplek',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete Komplek
     */
    public function destroy($id)
    {
        try {
            // Check if komplek has any warga
            $wargaCount = $this->supabase->count('warga', ['komplek_id' => 'eq.' . $id]);
            
            if ($wargaCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus komplek karena masih memiliki warga'
                ], 400);
            }

            $deleted = $this->supabase->delete('komplek', $id);
            
            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus komplek'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Komplek berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus komplek',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if Komplek name is available
     */
    public function checkName(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'except_id' => 'nullable|uuid'
        ]);

        try {
            $name = $request->name;
            $query = [
                'nama' => 'eq.' . $name,
                'select' => 'id'
            ];

            if ($request->except_id) {
                $query['id'] = 'neq.' . $request->except_id;
            }

            $exists = $this->supabase->exists('komplek', $query);
            
            return response()->json([
                'available' => !$exists,
                'message' => $exists ? 'Nama komplek sudah digunakan' : 'Nama komplek tersedia'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memeriksa ketersediaan nama',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
