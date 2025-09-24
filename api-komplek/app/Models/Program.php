<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Program extends Model
{
    use HasFactory;

    protected $fillable = [
        'desc', 'nominal', 'info', 'deadline', 'phone', 'rekening',
        'link_type', 'link_url', 'image', 'is_active', 'metadata'
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'deadline' => 'date',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByLinkType($query, $type)
    {
        return $query->where('link_type', $type);
    }

    // Accessors
    public function getFormattedNominalAttribute()
    {
        if (!$this->nominal) return null;
        return 'Rp ' . number_format($this->nominal, 0, ',', '.');
    }

    public function getFormattedDeadlineAttribute()
    {
        return $this->deadline ? $this->deadline->format('d M Y') : null;
    }

    public function getIsExpiredAttribute()
    {
        return $this->deadline && $this->deadline->isPast();
    }
}