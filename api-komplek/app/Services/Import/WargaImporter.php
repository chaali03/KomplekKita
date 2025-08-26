<?php

namespace App\Services\Import;

use App\Models\{ImportBatch, ImportError, Warga};
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;

class WargaImporter
{
    /**
     * Parse, validate, and persist Warga from Excel.
     * NOTE: Implement after installing phpoffice/phpspreadsheet.
     */
    public function import(int $komplekId, UploadedFile $file, int $userId = null): array
    {
        // Placeholder structure
        $batch = DB::transaction(function () use ($komplekId, $userId) {
            return ImportBatch::create([
                'komplek_id' => $komplekId,
                'tipe' => 'warga',
                'total_rows' => 0,
                'success_rows' => 0,
                'fail_rows' => 0,
                'created_by' => $userId,
            ]);
        });

        // After parsing rows, fill counts and create ImportError entries for invalid rows.

        return [
            'batch_id' => $batch->id,
            'summary' => [
                'total' => 0,
                'success' => 0,
                'failed' => 0,
                'errors' => [],
            ],
        ];
    }
}
