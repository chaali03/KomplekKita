<?php

namespace App\Http\Controllers;

use App\Models\Iuran;
use App\Models\IuranPayment;
use App\Models\Warga;
use App\Models\FinancialTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class IuranController extends Controller
{
    /**
     * Get current iuran status
     */
    public function getStatus(Request $request): JsonResponse
    {
        $komplekId = $request->get('komplek_id', 1);
        $periode = $request->get('periode', Carbon::now()->format('Y-m'));
        
        // Get current iuran for the period
        $iuran = Iuran::where('periode', $periode)->first();
        
        if (!$iuran) {
            // Get total warga count
            $totalWarga = Warga::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'periode' => $periode,
                    'total_warga' => $totalWarga,
                    'warga_sudah_bayar' => 0,
                    'warga_belum_bayar' => $totalWarga,
                    'nominal' => 0,
                    'total_pemasukan' => 0,
                    'target_pemasukan' => 0,
                    'is_completed' => false,
                    'is_closed' => false,
                    'completion_percentage' => 0,
                    'remaining_amount' => 0,
                    'payments' => []
                ]
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
        
        // Get payment details
        $payments = $iuran->payments()
            ->with('warga')
            ->orderBy('payment_date', 'desc')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => [
                'periode' => $iuran->periode,
                'total_warga' => $iuran->total_warga,
                'warga_sudah_bayar' => $iuran->warga_sudah_bayar,
                'warga_belum_bayar' => $iuran->warga_belum_bayar,
                'nominal' => $iuran->nominal,
                'total_pemasukan' => $iuran->total_pemasukan,
                'target_pemasukan' => $iuran->target_pemasukan,
                'is_completed' => $iuran->is_completed,
                'is_closed' => $iuran->is_closed,
                'completion_percentage' => $iuran->completion_percentage,
                'remaining_amount' => $iuran->remaining_amount,
                'payments' => $payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'warga_id' => $payment->warga_id,
                        'warga_name' => $payment->warga->nama_lengkap ?? 'Unknown',
                        'amount' => $payment->amount,
                        'payment_date' => $payment->payment_date ? $payment->payment_date->format('Y-m-d') : null,
                        'status' => $payment->status,
                        'notes' => $payment->notes
                    ];
                })
            ]
        ], 200, [
            'Access-Control-Allow-Origin' => 'http://localhost:4323',
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
            'Access-Control-Max-Age' => '86400',
        ]);
    }
    
    /**
     * Create or update iuran for current period
     */
    public function createOrUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'nominal' => 'required|numeric|min:0',
            'periode' => 'required|date_format:Y-m'
        ]);
        
        $periode = $request->periode;
        $nominal = $request->nominal;
        
        DB::beginTransaction();
        
        try {
            // Get total warga count
            $totalWarga = Warga::count();
            
            // Check if iuran already exists
            $iuran = Iuran::where('periode', $periode)->first();
            
            if ($iuran) {
                // Update existing iuran
                $oldNominal = $iuran->nominal;
                $iuran->update([
                    'nominal' => $nominal,
                    'total_warga' => $totalWarga,
                    'target_pemasukan' => $totalWarga * $nominal,
                    'warga_belum_bayar' => $totalWarga - $iuran->warga_sudah_bayar
                ]);
                
                // If nominal changed, update existing payments
                if ($oldNominal != $nominal) {
                    $iuran->payments()->update(['amount' => $nominal]);
                    $iuran->update([
                        'total_pemasukan' => $iuran->warga_sudah_bayar * $nominal
                    ]);
                }
            } else {
                // Create new iuran
                $iuran = Iuran::create([
                    'periode' => $periode,
                    'nominal' => $nominal,
                    'total_warga' => $totalWarga,
                    'warga_sudah_bayar' => 0,
                    'warga_belum_bayar' => $totalWarga,
                    'total_pemasukan' => 0,
                    'target_pemasukan' => $totalWarga * $nominal,
                    'is_closed' => false,
                    'is_completed' => false
                ]);
                
                // Create payment records for all warga
                $wargas = Warga::all();
                foreach ($wargas as $warga) {
                    IuranPayment::create([
                        'iuran_id' => $iuran->id,
                        'warga_id' => $warga->id,
                        'amount' => $nominal,
                        'payment_date' => null,
                        'status' => 'unpaid'
                    ]);
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Iuran berhasil disimpan',
                'data' => $iuran->fresh()
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan iuran: ' . $e->getMessage()
            ], 500, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
    }
    
    /**
     * Mark warga as paid
     */
    public function markAsPaid(Request $request): JsonResponse
    {
        $request->validate([
            'warga_id' => 'required|exists:wargas,id',
            'periode' => 'required|date_format:Y-m'
        ]);
        
        DB::beginTransaction();
        
        try {
            $iuran = Iuran::where('periode', $request->periode)->first();
            if (!$iuran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Iuran untuk periode ini tidak ditemukan'
                ], 404, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            $payment = IuranPayment::where('iuran_id', $iuran->id)
                ->where('warga_id', $request->warga_id)
            ->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data pembayaran tidak ditemukan'
                ], 404, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            if ($payment->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Warga ini sudah membayar iuran'
                ], 400, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            // Update payment status
            $payment->update([
                'status' => 'paid',
                'payment_date' => now()
            ]);
            
            // Update iuran statistics
            $iuran->increment('warga_sudah_bayar');
            $iuran->decrement('warga_belum_bayar');
            $iuran->increment('total_pemasukan', $payment->amount);
            
            // Add to financial transactions
            FinancialTransaction::create([
                'type' => 'Masuk',
                'amount' => $payment->amount,
                'date' => now()->format('Y-m-d'),
                'category' => 'Iuran Bulanan',
                'description' => "Iuran bulan {$iuran->periode} - " . ($payment->warga->nama_lengkap ?? 'Unknown'),
                'created_at' => now()
            ]);
            
            // Check if all warga have paid
            if ($iuran->warga_sudah_bayar >= $iuran->total_warga) {
                $iuran->update(['is_completed' => true]);
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil dicatat',
                'data' => $payment->fresh()
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat pembayaran: ' . $e->getMessage()
            ], 500, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
    }
    
    /**
     * Mark warga as unpaid (undo payment)
     */
    public function markAsUnpaid(Request $request): JsonResponse
    {
        $request->validate([
            'warga_id' => 'required|exists:wargas,id',
            'periode' => 'required|date_format:Y-m'
        ]);
        
        DB::beginTransaction();
        
        try {
            $iuran = Iuran::where('periode', $request->periode)->first();
            if (!$iuran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Iuran untuk periode ini tidak ditemukan'
                ], 404, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            $payment = IuranPayment::where('iuran_id', $iuran->id)
                ->where('warga_id', $request->warga_id)
                ->first();
            
            if (!$payment || $payment->status !== 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Warga ini belum membayar iuran'
                ], 400, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            // Update payment status
            $payment->update([
                'status' => 'unpaid',
                'payment_date' => null
            ]);
            
            // Update iuran statistics
            $iuran->decrement('warga_sudah_bayar');
            $iuran->increment('warga_belum_bayar');
            $iuran->decrement('total_pemasukan', $payment->amount);
            $iuran->update(['is_completed' => false]);
            
            // Remove from financial transactions
            FinancialTransaction::where('type', 'Masuk')
                ->where('category', 'Iuran Bulanan')
                ->where('description', 'like', "%{$payment->warga->nama_lengkap}%")
                ->where('amount', $payment->amount)
                ->delete();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil dibatalkan',
                'data' => $payment->fresh()
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal membatalkan pembayaran: ' . $e->getMessage()
            ], 500, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
    }
    
    /**
     * Update nominal for existing iuran
     */
    public function updateNominal(Request $request): JsonResponse
    {
        $request->validate([
            'nominal' => 'required|numeric|min:1',
            'periode' => 'required|date_format:Y-m'
        ]);
        
        $periode = $request->periode;
        $nominal = $request->nominal;
        
        DB::beginTransaction();
        
        try {
            $iuran = Iuran::where('periode', $periode)->first();
            
            if (!$iuran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Iuran untuk periode ini tidak ditemukan'
                ], 404, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            $oldNominal = $iuran->nominal;
            
            // Update iuran nominal and target
            $iuran->update([
                'nominal' => $nominal,
                'target_pemasukan' => $iuran->total_warga * $nominal
            ]);
            
            // Update existing payment amounts
            $iuran->payments()->update(['amount' => $nominal]);
            
            // Recalculate total pemasukan based on paid warga
            $iuran->update([
                'total_pemasukan' => $iuran->warga_sudah_bayar * $nominal
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Nominal iuran berhasil diupdate',
                'data' => $iuran->fresh()
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate nominal iuran: ' . $e->getMessage()
            ], 500, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
    }
    
    /**
     * Reset iuran for current period (restart from beginning)
     */
    public function resetIuran(Request $request): JsonResponse
    {
        $request->validate([
            'periode' => 'required|date_format:Y-m'
        ]);
        
        DB::beginTransaction();
        
        try {
            $iuran = Iuran::where('periode', $request->periode)->first();
            if (!$iuran) {
                return response()->json([
                    'success' => false,
                    'message' => 'Iuran untuk periode ini tidak ditemukan'
                ], 404, [
                    'Access-Control-Allow-Origin' => 'http://localhost:4323',
                    'Vary' => 'Origin',
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                    'Access-Control-Max-Age' => '86400',
                ]);
            }
            
            // Remove all financial transactions for this iuran
            FinancialTransaction::where('type', 'Masuk')
                ->where('category', 'Iuran Bulanan')
                ->where('description', 'like', "%{$iuran->periode}%")
                ->delete();
            
            // Reset all payments to unpaid
            $iuran->payments()->update([
                'status' => 'unpaid',
                'payment_date' => null
            ]);
            
            // Reset iuran statistics
            $iuran->update([
                'warga_sudah_bayar' => 0,
                'warga_belum_bayar' => $iuran->total_warga,
                'total_pemasukan' => 0,
                'is_completed' => false,
                'is_closed' => false
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Iuran berhasil direset',
                'data' => $iuran->fresh()
            ], 200, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mereset iuran: ' . $e->getMessage()
            ], 500, [
                'Access-Control-Allow-Origin' => 'http://localhost:4323',
                'Vary' => 'Origin',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
                'Access-Control-Max-Age' => '86400',
            ]);
        }
    }
}
