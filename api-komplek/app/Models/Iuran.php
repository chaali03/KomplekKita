<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Iuran extends Model
{
    use HasFactory;

    protected $table = 'iuran';

    protected $fillable = [
        'komplek_id',
        'periode', // format YYYY-MM
        'amount',  // nominal per bulan (integer rupiah)
    ];

    public function pembayaran(): HasMany
    {
        return $this->hasMany(IuranPembayaran::class);
    }
}
