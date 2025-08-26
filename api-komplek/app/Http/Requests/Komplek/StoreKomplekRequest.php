<?php

namespace App\Http\Requests\Komplek;

use Illuminate\Foundation\Http\FormRequest;

class StoreKomplekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // adjust when auth is added
    }

    public function rules(): array
    {
        return [
            'nama' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'profil' => ['nullable', 'string'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'ketua' => ['nullable', 'string', 'max:255'],
            'bendahara' => ['nullable', 'string', 'max:255'],
            'banner_path' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
