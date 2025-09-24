<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class InformationController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    public function publicIndex()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    public function getCategories()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'pengumuman',
                'kegiatan',
                'peraturan'
            ]
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $id,
                'title' => 'Information Title',
                'content' => 'Information content here',
                'category' => 'pengumuman'
            ]
        ]);
    }

    public function store(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Information created successfully'
        ], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Information updated successfully'
        ]);
    }

    public function destroy($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Information deleted successfully'
        ]);
    }
}
