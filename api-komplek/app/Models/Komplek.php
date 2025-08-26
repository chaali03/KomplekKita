<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Komplek extends Model
{
    use HasFactory;

    protected $table = 'komplek';

    protected $fillable = [
        'nama',
        'deskripsi',
        'profil',
        'lat',
        'lng',
        'ketua',
        'bendahara',
        'banner_path',
        'logo_path',
        'owner_user_id',
    ];
}
