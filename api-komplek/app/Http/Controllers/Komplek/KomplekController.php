<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use App\Http\Requests\Komplek\StoreKomplekRequest;
use App\Http\Requests\Komplek\UpdateKomplekRequest;
use App\Models\Komplek;
use Illuminate\Http\Request;

class KomplekController extends Controller
{
    public function index(Request $request)
    {
        // For now return all records ordered by latest; can be paginated later
        $komplek = Komplek::orderBy('created_at', 'desc')->get();
        return response()->json($komplek);
    }

    public function store(StoreKomplekRequest $request)
    {
        $data = $request->validated();
        $komplek = Komplek::create($data);
        return response()->json([
            'message' => 'Komplek created',
            'data' => $komplek,
        ], 201);
    }

    public function show($id)
    {
        $komplek = Komplek::findOrFail($id);
        return response()->json($komplek);
    }

    public function update(UpdateKomplekRequest $request, $id)
    {
        $komplek = Komplek::findOrFail($id);
        $data = $request->validated();
        $komplek->fill($data);
        $komplek->save();
        return response()->json([
            'message' => 'Komplek updated',
            'data' => $komplek,
        ]);
    }

    public function checkAvailability(Request $request)
    {
        $request->validate([
            'lat' => ['required','numeric'],
            'lng' => ['required','numeric'],
        ]);
        $lat = (float) $request->lat;
        $lng = (float) $request->lng;

        // naive proximity check ~ within ~50m (approx for demo; for prod use PostGIS/haversine)
        $delta = 0.0005; // ~55m near equator
        $exists = Komplek::whereBetween('lat', [$lat - $delta, $lat + $delta])
            ->whereBetween('lng', [$lng - $delta, $lng + $delta])
            ->exists();

        return response()->json([
            'available' => !$exists,
        ]);
    }
}
