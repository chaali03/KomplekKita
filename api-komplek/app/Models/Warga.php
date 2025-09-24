<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warga extends Model
{
    use HasFactory;

    protected $fillable = [
        'complex_id',
        'nama',
        'nik',
        'kk',
        'alamat',
        'rt',
        'rw',
        'no_rumah',
        'telepon',
        'email',
        'status',
        'tanggal_masuk',
        'tanggal_keluar',
        'verified',
    ];

    protected $casts = [
        'tanggal_masuk' => 'date',
        'tanggal_keluar' => 'date',
        'verified' => 'boolean',
    ];

    public function complex(): BelongsTo
    {
        return $this->belongsTo(Komplek::class, 'complex_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(WargaMember::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(WargaDocument::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(WargaHistory::class);
    }
}
