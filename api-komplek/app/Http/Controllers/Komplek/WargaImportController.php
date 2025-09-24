<?php
namespace App\Http\Controllers\Komplek;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WargaImportController
{
    public function preview(Request $request)
    {
        if (!$request->hasFile('file')) {
            return response()->json([
                'status'  => 'error',
                'message' => 'File tidak ditemukan. Kirimkan pada field: file',
            ], 400);
        }

        // TODO: Parse Excel and validate. For now return stub so UI can proceed.
        return response()->json([
            'status'  => 'ok',
            'data'    => [],
            'errors'  => [],
            'summary' => ['total' => 0, 'success' => 0, 'failed' => 0],
        ], 200);
    }
}
