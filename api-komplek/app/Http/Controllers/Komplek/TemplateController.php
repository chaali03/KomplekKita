<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class TemplateController extends Controller
{
    public function downloadWarga()
    {
        // TODO: Generate XLSX via PhpSpreadsheet. For now, return 501.
        return response()->json([
            'message' => 'Template Warga belum diimplementasikan. Install PhpSpreadsheet untuk generate XLSX.',
        ], 501);
    }

    public function downloadKeuangan()
    {
        // TODO: Generate XLSX via PhpSpreadsheet. For now, return 501.
        return response()->json([
            'message' => 'Template Keuangan belum diimplementasikan. Install PhpSpreadsheet untuk generate XLSX.',
        ], 501);
    }
}
