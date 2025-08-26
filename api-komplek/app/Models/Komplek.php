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
        'ketua_phone',
        'bendahara',
        'bendahara_phone',
        'banner_path',
        'logo_path',
        'owner_user_id',
    ];

    protected $appends = [
        'ketua_whatsapp_link',
        'bendahara_whatsapp_link',
    ];

    // Normalize phone numbers to digits only when setting
    public function setKetuaPhoneAttribute($value): void
    {
        $this->attributes['ketua_phone'] = $value !== null ? preg_replace('/[^0-9]/', '', (string) $value) : null;
    }

    public function setBendaharaPhoneAttribute($value): void
    {
        $this->attributes['bendahara_phone'] = $value !== null ? preg_replace('/[^0-9]/', '', (string) $value) : null;
    }

    public function getKetuaWhatsappLinkAttribute(): ?string
    {
        $phone = $this->ketua_phone;
        if (!$phone) return null;
        $p = preg_replace('/[^0-9]/', '', $phone);
        return $p ? ('https://wa.me/' . $p) : null;
    }

    public function getBendaharaWhatsappLinkAttribute(): ?string
    {
        $phone = $this->bendahara_phone;
        if (!$phone) return null;
        $p = preg_replace('/[^0-9]/', '', $phone);
        return $p ? ('https://wa.me/' . $p) : null;
    }
}
