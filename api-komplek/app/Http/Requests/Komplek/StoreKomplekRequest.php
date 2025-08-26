<?php

namespace App\Http\Requests\Komplek;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use App\Models\Komplek;

class StoreKomplekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // adjust when auth is added
    }

    public function rules(): array
    {
        return [
            'nama' => ['required', 'string', 'max:255', 'unique:komplek,nama'],
            'deskripsi' => ['nullable', 'string'],
            'profil' => ['nullable', 'string'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'ketua' => ['nullable', 'string', 'max:255', 'unique:komplek,ketua'],
            'ketua_phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\s()\-]+$/', 'unique:komplek,ketua_phone'],
            'bendahara' => ['nullable', 'string', 'max:255', 'unique:komplek,bendahara'],
            'bendahara_phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\s()\-]+$/', 'unique:komplek,bendahara_phone'],
            'banner_path' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $data = $this->all();

            // Ketua != Bendahara dalam satu Komplek
            if (!empty($data['ketua']) && !empty($data['bendahara']) && trim($data['ketua']) === trim($data['bendahara'])) {
                $v->errors()->add('ketua', 'Ketua RT dan Bendahara tidak boleh orang yang sama.');
                $v->errors()->add('bendahara', 'Ketua RT dan Bendahara tidak boleh orang yang sama.');
            }

            // Cross-role uniqueness: nama ketua tidak boleh sudah dipakai sebagai bendahara di Komplek lain, dan sebaliknya
            if (!empty($data['ketua'])) {
                $existsAsBendahara = Komplek::where('bendahara', trim($data['ketua']))->exists();
                if ($existsAsBendahara) {
                    $v->errors()->add('ketua', 'Nama Ketua RT sudah digunakan sebagai Bendahara pada Komplek lain. Silakan gunakan nama lain.');
                }
            }
            if (!empty($data['bendahara'])) {
                $existsAsKetua = Komplek::where('ketua', trim($data['bendahara']))->exists();
                if ($existsAsKetua) {
                    $v->errors()->add('bendahara', 'Nama Bendahara sudah digunakan sebagai Ketua RT pada Komplek lain. Silakan gunakan nama lain.');
                }
            }

            // Phone checks: normalize digits and validate uniqueness + cross-role + not-equal
            $norm = function ($p) { return $p !== null ? preg_replace('/[^0-9]/', '', (string) $p) : null; };
            $ketuaPhoneNorm = isset($data['ketua_phone']) ? $norm($data['ketua_phone']) : null;
            $bendaharaPhoneNorm = isset($data['bendahara_phone']) ? $norm($data['bendahara_phone']) : null;

            if ($ketuaPhoneNorm && $bendaharaPhoneNorm && $ketuaPhoneNorm === $bendaharaPhoneNorm) {
                $v->errors()->add('ketua_phone', 'Nomor HP Ketua RT dan Bendahara tidak boleh sama.');
                $v->errors()->add('bendahara_phone', 'Nomor HP Ketua RT dan Bendahara tidak boleh sama.');
            }
            if ($ketuaPhoneNorm) {
                // same as existing ketua_phone OR as someone else's bendahara_phone
                $existsKetuaPhone = Komplek::where('ketua_phone', $ketuaPhoneNorm)->exists();
                $existsAsBendaharaPhone = Komplek::where('bendahara_phone', $ketuaPhoneNorm)->exists();
                if ($existsKetuaPhone || $existsAsBendaharaPhone) {
                    $v->errors()->add('ketua_phone', 'Nomor HP Ketua RT sudah digunakan pada Komplek lain.');
                }
            }
            if ($bendaharaPhoneNorm) {
                $existsBendaharaPhone = Komplek::where('bendahara_phone', $bendaharaPhoneNorm)->exists();
                $existsAsKetuaPhone = Komplek::where('ketua_phone', $bendaharaPhoneNorm)->exists();
                if ($existsBendaharaPhone || $existsAsKetuaPhone) {
                    $v->errors()->add('bendahara_phone', 'Nomor HP Bendahara sudah digunakan pada Komplek lain.');
                }
            }

            // Lokasi unik secara kedekatan (tidak boleh terlalu dekat dengan Komplek lain)
            if (!empty($data['lat']) && !empty($data['lng'])) {
                $lat = (float) $data['lat'];
                $lng = (float) $data['lng'];
                $delta = 0.0005; // ~55m
                $nearbyExists = Komplek::whereBetween('lat', [$lat - $delta, $lat + $delta])
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
            'ketua_phone.unique' => 'Nomor HP Ketua RT sudah digunakan pada Komplek lain.',
            'bendahara_phone.unique' => 'Nomor HP Bendahara sudah digunakan pada Komplek lain.',
            'ketua_phone.regex' => 'Format nomor HP Ketua RT tidak valid. Hanya angka, spasi, plus, kurung, dan tanda minus.',
            'bendahara_phone.regex' => 'Format nomor HP Bendahara tidak valid. Hanya angka, spasi, plus, kurung, dan tanda minus.',
        ];
    }
}
