<?php

namespace App\Http\Requests\Komplek;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use App\Models\Komplek;

class UpdateKomplekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = (int) $this->route('id');
        return [
            'nama' => [
                'required', 'string', 'max:255',
                Rule::unique('komplek', 'nama')->ignore($id)
            ],
            'deskripsi' => ['nullable', 'string'],
            'profil' => ['nullable', 'string'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'ketua' => [
                'nullable', 'string', 'max:255',
                Rule::unique('komplek', 'ketua')->ignore($id)
            ],
            'bendahara' => [
                'nullable', 'string', 'max:255',
                Rule::unique('komplek', 'bendahara')->ignore($id)
            ],
            'banner_path' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $data = $this->all();

            if (!empty($data['ketua']) && !empty($data['bendahara']) && trim($data['ketua']) === trim($data['bendahara'])) {
                $v->errors()->add('ketua', 'Ketua RT dan Bendahara tidak boleh orang yang sama.');
                $v->errors()->add('bendahara', 'Ketua RT dan Bendahara tidak boleh orang yang sama.');
            }

            // Cross-role uniqueness (exclude current record)
            $id = (int) $this->route('id');
            if (!empty($data['ketua'])) {
                $existsAsBendahara = Komplek::where('id', '!=', $id)
                    ->where('bendahara', trim($data['ketua']))
                    ->exists();
                if ($existsAsBendahara) {
                    $v->errors()->add('ketua', 'Nama Ketua RT sudah digunakan sebagai Bendahara pada Komplek lain. Silakan gunakan nama lain.');
                }
            }
            if (!empty($data['bendahara'])) {
                $existsAsKetua = Komplek::where('id', '!=', $id)
                    ->where('ketua', trim($data['bendahara']))
                    ->exists();
                if ($existsAsKetua) {
                    $v->errors()->add('bendahara', 'Nama Bendahara sudah digunakan sebagai Ketua RT pada Komplek lain. Silakan gunakan nama lain.');
                }
            }

            if (!empty($data['lat']) && !empty($data['lng'])) {
                $lat = (float) $data['lat'];
                $lng = (float) $data['lng'];
                $delta = 0.0005; // ~55m
                $nearbyExists = Komplek::where('id', '!=', $id)
                    ->whereBetween('lat', [$lat - $delta, $lat + $delta])
                    ->whereBetween('lng', [$lng - $delta, $lng + $delta])
                    ->exists();
                if ($nearbyExists) {
                    $v->errors()->add('lat', 'Lokasi peta sudah digunakan untuk Komplek lain. Silakan pilih lokasi lain.');
                    $v->errors()->add('lng', 'Lokasi peta sudah digunakan untuk Komplek lain. Silakan pilih lokasi lain.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'nama.unique' => 'Nama komplek sudah terdaftar, silakan gunakan nama lain.',
            'ketua.unique' => 'Nama Ketua RT sudah digunakan pada Komplek lain.',
            'bendahara.unique' => 'Nama Bendahara sudah digunakan pada Komplek lain.',
        ];
    }
}
