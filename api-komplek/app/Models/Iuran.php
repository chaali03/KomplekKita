<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Iuran extends Model
{
    use HasFactory;

    protected $fillable = [
        'periode',
        'nominal',
        'total_warga',
        'warga_sudah_bayar',
        'warga_belum_bayar',
        'total_pemasukan',
        'target_pemasukan',
        'is_closed',
        'is_completed',
        'notes'
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'total_pemasukan' => 'decimal:2',
        'target_pemasukan' => 'decimal:2',
        'is_closed' => 'boolean',
        'is_completed' => 'boolean',
    ];

    public function payments(): HasMany
    {
        return $this->hasMany(IuranPayment::class);
    }

    // Helper methods
    public function getCompletionPercentageAttribute(): float
    {
        if ($this->total_warga == 0) return 0;
        return ($this->warga_sudah_bayar / $this->total_warga) * 100;
    }

    public function getRemainingAmountAttribute(): float
    {
        return $this->target_pemasukan - $this->total_pemasukan;
    }

    public function isFullyPaid(): bool
    {
        return $this->warga_sudah_bayar >= $this->total_warga;
    }
}
