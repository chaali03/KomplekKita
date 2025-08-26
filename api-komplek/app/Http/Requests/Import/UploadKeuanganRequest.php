<?php

namespace App\Http\Requests\Import;

use Illuminate\Foundation\Http\FormRequest;

class UploadKeuanganRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // adjust to auth later
    }

    public function rules(): array
    {
        return [
            'file' => ['required','file','mimes:xlsx,xls','max:5120'], // 5MB
        ];
    }
}
