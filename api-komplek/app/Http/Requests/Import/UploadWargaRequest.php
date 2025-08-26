<?php

namespace App\Http\Requests\Import;

use Illuminate\Foundation\Http\FormRequest;

class UploadWargaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // adjust to auth later
    }

    public function rules(): array
    {
        return [
            // Accept many CSV/XLS(X) MIME types from different browsers/editors
            'file' => [
                'required',
                'file',
                'max:5120', // 5MB
                'mimetypes:text/csv,text/plain,application/csv,application/x-csv,text/x-csv,application/vnd.ms-excel,application/octet-stream,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ],
        ];
    }
}
