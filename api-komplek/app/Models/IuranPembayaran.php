<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IuranPembayaran extends Model
{
    use HasFactory;

    protected $table = 'iuran_pembayaran';

    protected $fillable = [
        'iuran_id',
        'warga_id',
        'amount',
        'method',
        'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
    ];

    public function iuran(): BelongsTo
    {
        return $this->belongsTo(Iuran::class);
    }

    public function warga(): BelongsTo
    {
        return $this->belongsTo(Warga::class);
    }
}
