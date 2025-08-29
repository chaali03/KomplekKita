<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Program extends Model
{
    use HasFactory;

    protected $table = 'program';

    protected $fillable = [
        'komplek_id','judul','deskripsi','tanggal_mulai','tanggal_selesai','status','meta'
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'meta' => 'array',
    ];
}
