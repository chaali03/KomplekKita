<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notifikasi extends Model
{
    use HasFactory;

    protected $table = 'notifikasi';

    protected $fillable = [
        'komplek_id','judul','isi','target','terkirim_at','meta'
    ];

    protected $casts = [
        'terkirim_at' => 'datetime',
        'meta' => 'array',
    ];
}
