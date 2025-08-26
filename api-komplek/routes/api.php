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
Route::get('/komplek/{id}', [KomplekController::class, 'show']);
Route::get('/komplek/check-availability', [KomplekController::class, 'checkAvailability']);
Route::get('/komplek/check', [KomplekController::class, 'checkAvailability']);
Route::middleware('auth:sanctum')->post('/komplek', [KomplekController::class, 'store']);

// Komplek: Templates (download as XLSX)
Route::get('/komplek/{id}/templates/warga', [TemplateController::class, 'downloadWarga']);
Route::get('/komplek/{id}/templates/keuangan', [TemplateController::class, 'downloadKeuangan']);

// Komplek: Imports (Excel uploads)
Route::post('/komplek/{id}/import/warga', [WargaImportController::class, 'upload']);
Route::post('/komplek/{id}/import/keuangan', [KeuanganImportController::class, 'upload']);
