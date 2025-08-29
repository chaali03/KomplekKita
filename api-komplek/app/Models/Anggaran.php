<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Anggaran extends Model
{
    use HasFactory;

    protected $table = 'anggaran';

    protected $fillable = [
        'komplek_id','periode','kategori','rencana','realisasi','catatan'
    ];

    protected $casts = [
        'rencana' => 'decimal:2',
        'realisasi' => 'decimal:2',
    ];
}
