<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Komplek\KomplekController;
use App\Http\Controllers\Komplek\TemplateController;
use App\Http\Controllers\Komplek\WargaImportController;
use App\Http\Controllers\Komplek\KeuanganImportController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\InformasiController;
use App\Http\Controllers\AnggaranController;
use App\Http\Controllers\WargaController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\TransaksiKeuanganController;
use App\Http\Controllers\PengaturanController;
use App\Http\Controllers\IuranController;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

// Simple health and version endpoints (no DB access)
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'env' => config('app.env'),
        'time' => now()->toIso8601String(),
    ]);
});

Route::get('/version', function () {
    return response()->json([
        'laravel' => app()->version(),
        'php' => PHP_VERSION,
    ]);
});

// Auth: Registration & Session (Sanctum SPA)
Route::post('/register', [RegisteredUserController::class, 'store']);
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::middleware('auth:sanctum')->post('/logout', [AuthenticatedSessionController::class, 'destroy']);

// Password Reset
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store']);
Route::post('/reset-password', [NewPasswordController::class, 'store']);

// Email Verification
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');
});

// Komplek Endpoints
Route::get('/komplek', [KomplekController::class, 'index']);
Route::get('/komplek/{id}', [KomplekController::class, 'show']);
Route::get('/komplek/check-availability', [KomplekController::class, 'checkAvailability']);
Route::get('/komplek/check', [KomplekController::class, 'checkAvailability']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/komplek', [KomplekController::class, 'store']);
    Route::put('/komplek/{id}', [KomplekController::class, 'update']);
    Route::patch('/komplek/{id}', [KomplekController::class, 'update']);
});

// Komplek: Templates (download as XLSX)
Route::get('/komplek/{id}/templates/warga', [TemplateController::class, 'downloadWarga']);
Route::get('/komplek/{id}/templates/keuangan', [TemplateController::class, 'downloadKeuangan']);
// Id-less template routes to allow download before Komplek exists
Route::get('/templates/warga', [TemplateController::class, 'downloadWarga']);
Route::get('/templates/keuangan', [TemplateController::class, 'downloadKeuangan']);

// Komplek: Imports (Excel uploads)
Route::post('/komplek/{id}/import/warga', [WargaImportController::class, 'upload']);
Route::post('/komplek/{id}/import/keuangan', [KeuanganImportController::class, 'upload']);
// Preview import routes (no Komplek ID required) — reuse same validators
Route::post('/import/warga/preview', [WargaImportController::class, 'upload'])->defaults('id', 0);
Route::post('/import/keuangan/preview', [KeuanganImportController::class, 'upload'])->defaults('id', 0);

// -----------------------------
// Admin endpoints (require komplek_id)
// -----------------------------
Route::middleware(['auth:sanctum'])->group(function () {
    // Warga
    Route::get('/warga', [WargaController::class, 'index']);
    Route::post('/warga', [WargaController::class, 'store']);
    Route::put('/warga/{id}', [WargaController::class, 'update']);
    Route::patch('/warga/{id}', [WargaController::class, 'update']);
    Route::delete('/warga/{id}', [WargaController::class, 'destroy']);

    // Transaksi Keuangan
    Route::get('/transaksi', [TransaksiKeuanganController::class, 'index']);
    Route::post('/transaksi', [TransaksiKeuanganController::class, 'store']);
    Route::put('/transaksi/{id}', [TransaksiKeuanganController::class, 'update']);
    Route::patch('/transaksi/{id}', [TransaksiKeuanganController::class, 'update']);
    Route::delete('/transaksi/{id}', [TransaksiKeuanganController::class, 'destroy']);
    Route::get('/transaksi/summary', [TransaksiKeuanganController::class, 'summary']);

    // Anggaran
    Route::get('/anggaran', [AnggaranController::class, 'index']);
    Route::post('/anggaran', [AnggaranController::class, 'store']);
    Route::put('/anggaran/{id}', [AnggaranController::class, 'update']);
    Route::patch('/anggaran/{id}', [AnggaranController::class, 'update']);
    Route::delete('/anggaran/{id}', [AnggaranController::class, 'destroy']);
    Route::get('/anggaran/summary', [AnggaranController::class, 'summary']);

    // Program
    Route::get('/program', [ProgramController::class, 'index']);
    Route::post('/program', [ProgramController::class, 'store']);
    Route::put('/program/{id}', [ProgramController::class, 'update']);
    Route::patch('/program/{id}', [ProgramController::class, 'update']);
    Route::delete('/program/{id}', [ProgramController::class, 'destroy']);

    // Informasi
    Route::get('/informasi', [InformasiController::class, 'index']);
    Route::post('/informasi', [InformasiController::class, 'store']);
    Route::put('/informasi/{id}', [InformasiController::class, 'update']);
    Route::patch('/informasi/{id}', [InformasiController::class, 'update']);
    Route::delete('/informasi/{id}', [InformasiController::class, 'destroy']);

    // Notifikasi (arsip)
    Route::get('/notifikasi', [NotifikasiController::class, 'index']);
    Route::post('/notifikasi', [NotifikasiController::class, 'store']);
    Route::put('/notifikasi/{id}', [NotifikasiController::class, 'update']);
    Route::patch('/notifikasi/{id}', [NotifikasiController::class, 'update']);
    Route::delete('/notifikasi/{id}', [NotifikasiController::class, 'destroy']);

    // Pengaturan (key/value per komplek)
    Route::get('/pengaturan', [PengaturanController::class, 'index']);
    Route::put('/pengaturan', [PengaturanController::class, 'update']);

    // Iuran Bulanan (admin)
    Route::post('/iuran/generate', [IuranController::class, 'generate']);
    Route::post('/iuran/mark', [IuranController::class, 'mark']);
});

// -----------------------------
// Public endpoints (read-only, require komplek_id via query)
// -----------------------------
Route::get('/public/warga/stats', [WargaController::class, 'publicStats']);
Route::get('/public/transaksi/summary', [TransaksiKeuanganController::class, 'summary']);
Route::get('/public/anggaran/summary', [AnggaranController::class, 'summary']);
Route::get('/public/program', [ProgramController::class, 'publicIndex']);
Route::get('/public/informasi', [InformasiController::class, 'publicIndex']);
Route::get('/public/iuran/status', [IuranController::class, 'status']);
