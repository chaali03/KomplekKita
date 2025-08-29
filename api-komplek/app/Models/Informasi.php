<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Informasi extends Model
{
    use HasFactory;

    protected $table = 'informasi';

    protected $fillable = [
        'komplek_id','judul','isi','status','tayang_mulai','tayang_selesai','meta'
    ];

    protected $casts = [
        'tayang_mulai' => 'datetime',
        'tayang_selesai' => 'datetime',
        'meta' => 'array',
    ];
}
