<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Komplek extends Model
{
    use HasFactory;

    protected  = [
        'user_id',
        'nama',
        'deskripsi',
        'profil',
        'lat',
        'lng',
        'ketua',
        'ketua_phone',
        'bendahara',
        'bendahara_phone',
        'banner_path',
        'logo_path',
        'completed_at',
    ];
}
