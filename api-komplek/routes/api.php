<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Komplek\KomplekController;
use App\Http\Controllers\Komplek\WargaImportController;
use App\Http\Controllers\Komplek\KeuanganImportController;
use App\Http\Controllers\Komplek\TemplateController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
*/

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'time' => now()->toIso8601String(),
    ]);
});

Route::get('/version', function () {
    return response()->json([
        'app' => config('app.name'),
        'laravel' => app()->version(),
    ]);
});

// TODO: Auth endpoints (Sanctum + Breeze API)
// Route::prefix('auth')->group(function () {
//     Route::post('register', [AuthController::class, 'register']);
//     Route::post('login', [AuthController::class, 'login']);
//     Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink']);
//     Route::post('reset-password', [PasswordResetController::class, 'reset']);
//     Route::middleware('auth:sanctum')->post('logout', [AuthController::class, 'logout']);
// });

// Initial Komplek endpoints (temporarily public until auth wired)
Route::post('/komplek', [KomplekController::class, 'store']);
Route::get('/komplek/{id}', [KomplekController::class, 'show']);
Route::get('/komplek/check', [KomplekController::class, 'checkAvailability']);
Route::post('/komplek/{id}/warga/upload', [WargaImportController::class, 'upload']);
Route::post('/komplek/{id}/keuangan/upload', [KeuanganImportController::class, 'upload']);

// Template download endpoints
Route::get('/templates/warga', [TemplateController::class, 'downloadWarga']);
Route::get('/templates/keuangan', [TemplateController::class, 'downloadKeuangan']);
