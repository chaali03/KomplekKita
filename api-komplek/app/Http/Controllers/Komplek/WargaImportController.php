<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use App\Http\Requests\Import\UploadWargaRequest;
use Illuminate\Http\Request;

class WargaImportController extends Controller
{
    public function upload(UploadWargaRequest $request, int $id)
    {
        // NOTE: PhpSpreadsheet belum diinstal. Untuk sementara, kita balikan response placeholder.
        // Setelah dependency siap, panggil service importer untuk parsing + validasi + persist.
        $file = $request->file('file');

        return response()->json([
            'message' => 'Endpoint warga upload siap. Instal phpoffice/phpspreadsheet dan implementasi importer untuk memproses file.',
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
