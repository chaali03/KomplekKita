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
            'ketua_phone' => [
                'nullable', 'string', 'max:20', 'regex:/^[0-9+\s()\-]+$/',
                Rule::unique('komplek', 'ketua_phone')->ignore($id)
            ],
            'bendahara' => [
                'nullable', 'string', 'max:255',
                Rule::unique('komplek', 'bendahara')->ignore($id)
            ],
            'bendahara_phone' => [
                'nullable', 'string', 'max:20', 'regex:/^[0-9+\s()\-]+$/',
                Rule::unique('komplek', 'bendahara_phone')->ignore($id)
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

            // Disallow animal names and profanity for nama, ketua, bendahara
            $fieldsToCheck = [
                'nama' => 'Nama komplek',
                'ketua' => 'Nama Ketua RT',
                'bendahara' => 'Nama Bendahara',
            ];
            foreach ($fieldsToCheck as $field => $label) {
                $val = isset($data[$field]) ? (string) $data[$field] : '';
                if ($val !== '') {
                    $bad = $this->findBannedTerm($val);
                    if ($bad !== null) {
                        $v->errors()->add($field, $label.' tidak boleh mengandung nama hewan atau kata-kata tidak pantas (ditemukan: "'.$bad.'").');
                    }
                }
            }

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

            // Phone: normalize and ensure uniqueness/cross-role excluding current record
            $norm = function ($p) { return $p !== null ? preg_replace('/[^0-9]/', '', (string) $p) : null; };
            $ketuaPhoneNorm = isset($data['ketua_phone']) ? $norm($data['ketua_phone']) : null;
            $bendaharaPhoneNorm = isset($data['bendahara_phone']) ? $norm($data['bendahara_phone']) : null;

            if ($ketuaPhoneNorm && $bendaharaPhoneNorm && $ketuaPhoneNorm === $bendaharaPhoneNorm) {
                $v->errors()->add('ketua_phone', 'Nomor HP Ketua RT dan Bendahara tidak boleh sama.');
                $v->errors()->add('bendahara_phone', 'Nomor HP Ketua RT dan Bendahara tidak boleh sama.');
            }
            if ($ketuaPhoneNorm) {
                $existsKetuaPhone = Komplek::where('id', '!=', $id)->where('ketua_phone', $ketuaPhoneNorm)->exists();
                $existsAsBendaharaPhone = Komplek::where('id', '!=', $id)->where('bendahara_phone', $ketuaPhoneNorm)->exists();
                if ($existsKetuaPhone || $existsAsBendaharaPhone) {
                    $v->errors()->add('ketua_phone', 'Nomor HP Ketua RT sudah digunakan pada Komplek lain.');
                }
            }
            if ($bendaharaPhoneNorm) {
                $existsBendaharaPhone = Komplek::where('id', '!=', $id)->where('bendahara_phone', $bendaharaPhoneNorm)->exists();
                $existsAsKetuaPhone = Komplek::where('id', '!=', $id)->where('ketua_phone', $bendaharaPhoneNorm)->exists();
                if ($existsBendaharaPhone || $existsAsKetuaPhone) {
                    $v->errors()->add('bendahara_phone', 'Nomor HP Bendahara sudah digunakan pada Komplek lain.');
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

    /**
     * Return matched banned term (lowercase) if found in input, otherwise null.
     */
    protected function findBannedTerm(string $input): ?string
    {
        $hay = mb_strtolower($input, 'UTF-8');
        $banned = [
            'anjing','asu','babi','bangsat','kampret','kontol','memek','peler','jembut','tai','goblok','tolol','bego','idiot','pepek','kenthu','ngentot','pukimak',
            'kucing','anjing','ayam','kambing','sapi','monyet','kera','buaya','ular','banteng','babi','kodok','cicak','biawak','burung',
        ];
        foreach ($banned as $term) {
            $pattern = '/(?<!\p{L})'.preg_quote($term, '/').'(?!\p{L})/u';
            if (preg_match($pattern, $hay)) {
                return $term;
            }
        }
        return null;
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
