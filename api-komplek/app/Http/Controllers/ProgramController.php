<?php

namespace App\Http\Controllers;

use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ProgramController extends Controller
{
    /**
     * Get all programs (admin)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Program::query();

        // Filter by active status
        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        // Filter by link type
        if ($request->filled('link_type')) {
            $query->where('link_type', $request->string('link_type'));
        }

        // Search by description
        if ($request->filled('search')) {
            $query->where('desc', 'like', '%' . $request->string('search') . '%');
        }

        $programs = $query->orderBy('deadline', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $programs
        ]);
    }

    /**
     * Get active programs for public display
     */
    public function publicIndex(): JsonResponse
    {
        $programs = Program::active()
            ->orderBy('deadline', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $programs
        ]);
    }

    /**
     * Store a new program
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'desc' => 'required|string|max:255',
            'nominal' => 'nullable|numeric|min:0',
            'info' => 'nullable|string',
            'deadline' => 'required|date|after:today',
            'phone' => 'nullable|string|max:20',
            'rekening' => 'nullable|string|max:50',
            'link_type' => 'required|in:wa,qris',
            'link_url' => 'required|url',
            'image' => 'nullable|string', // Base64 image
            'metadata' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        // Handle image upload if provided
        if (!empty($data['image'])) {
            $data['image'] = $this->processImage($data['image']);
        }

        $program = Program::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Program created successfully',
            'data' => $program
        ], 201);
    }

    /**
     * Get a specific program
     */
    public function show(string $id): JsonResponse
    {
        $program = Program::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $program
        ]);
    }

    /**
     * Update a program
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $program = Program::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'desc' => 'sometimes|required|string|max:255',
            'nominal' => 'nullable|numeric|min:0',
            'info' => 'nullable|string',
            'deadline' => 'sometimes|required|date',
            'phone' => 'nullable|string|max:20',
            'rekening' => 'nullable|string|max:50',
            'link_type' => 'sometimes|required|in:wa,qris',
            'link_url' => 'sometimes|required|url',
            'image' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'metadata' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        // Handle image update
        if (isset($data['image'])) {
            if (!empty($data['image'])) {
                $data['image'] = $this->processImage($data['image']);
            } else {
                $data['image'] = null;
            }
        }

        $program->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Program updated successfully',
            'data' => $program
        ]);
    }

    /**
     * Delete a program
     */
    public function destroy(string $id): JsonResponse
    {
        $program = Program::findOrFail($id);
        $program->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Program deleted successfully'
        ]);
    }

    /**
     * Process base64 image and save to storage
     */
    private function processImage(string $base64Image): string
    {
        // Remove data URL prefix if present
        if (strpos($base64Image, 'data:image/') === 0) {
            $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
        }

        // Decode base64
        $imageData = base64_decode($base64Image);
        
        // Generate unique filename
        $filename = 'program_' . uniqid() . '.jpg';
        $path = 'programs/' . $filename;

        // Save to storage
        Storage::disk('public')->put($path, $imageData);

        return $path;
    }
}