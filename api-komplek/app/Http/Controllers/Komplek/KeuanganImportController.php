<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use App\Http\Requests\Import\UploadKeuanganRequest;
use Illuminate\Http\Request;

class KeuanganImportController extends Controller
{
    public function upload(UploadKeuanganRequest $request, int $id)
    {
        // Placeholder until PhpSpreadsheet + service implemented
        $file = $request->file('file');
        return response()->json([
            'message' => 'Endpoint keuangan upload siap. Instal phpoffice/phpspreadsheet dan implementasi importer untuk memproses file.',
            'komplek_id' => $id,
            'file' => [
                'original' => $file?->getClientOriginalName(),
                'mime' => $file?->getMimeType(),
                'size' => $file?->getSize(),
            ],
            'status' => 'not_implemented',
        ], 501);
    }
}
