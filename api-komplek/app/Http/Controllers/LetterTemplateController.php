<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LetterTemplateController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    public function getTypes()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'surat_keterangan',
                'surat_izin',
                'surat_undangan'
            ]
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $id,
                'title' => 'Template Letter',
                'content' => 'Letter content here'
            ]
        ]);
    }

    public function download($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Download initiated'
        ]);
    }

    public function store(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Template created successfully'
        ], 201);
    }

    public function replace(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Template replaced successfully'
        ]);
    }

    public function update(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Template updated successfully'
        ]);
    }

    public function destroy($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Template deleted successfully'
        ]);
    }
}
