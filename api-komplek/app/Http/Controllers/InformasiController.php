<?php

namespace App\Http\Controllers;

use App\Models\Informasi;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InformasiController extends Controller
{
    // Admin: list
    public function index(Request $request)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'status' => ['nullable', Rule::in(['draft','publish','arsip'])],
        ]);
        $q = Informasi::query()->where('komplek_id', $validated['komplek_id']);
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        return $q->latest()->paginate(20);
    }

    // Admin: create
    public function store(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'judul' => ['required','string','max:255'],
            'isi' => ['nullable','string'],
            'status' => ['required', Rule::in(['draft','publish','arsip'])],
            'tayang_mulai' => ['nullable','date'],
            'tayang_selesai' => ['nullable','date','after_or_equal:tayang_mulai'],
            'meta' => ['nullable','array'],
        ]);
        $info = Informasi::create($data);
        return response()->json($info, 201);
    }

    // Admin: update
    public function update(Request $request, int $id)
    {
        $info = Informasi::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'judul' => ['sometimes','string','max:255'],
            'isi' => ['sometimes','nullable','string'],
            'status' => ['sometimes', Rule::in(['draft','publish','arsip'])],
            'tayang_mulai' => ['sometimes','nullable','date'],
            'tayang_selesai' => ['sometimes','nullable','date','after_or_equal:tayang_mulai'],
            'meta' => ['sometimes','nullable','array'],
        ]);
        if ($info->komplek_id !== (int)$data['komplek_id']) {
            return response()->json(['message'=>'komplek_id mismatch'], 422);
        }
        $info->fill($data)->save();
        return $info;
    }

    // Admin: delete
    public function destroy(Request $request, int $id)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $info = Informasi::where('id',$id)->where('komplek_id',$validated['komplek_id'])->firstOrFail();
        $info->delete();
        return response()->noContent();
    }

    // Public: list publish + schedule
    public function publicIndex(Request $request)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $now = now();
        $q = Informasi::query()
            ->where('komplek_id', $validated['komplek_id'])
            ->where('status','publish')
            ->where(function($qq) use ($now){ $qq->whereNull('tayang_mulai')->orWhere('tayang_mulai','<=',$now); })
            ->where(function($qq) use ($now){ $qq->whereNull('tayang_selesai')->orWhere('tayang_selesai','>=',$now); })
            ->orderByDesc('tayang_mulai')
            ->orderByDesc('id');
        return $q->paginate(20);
    }
}
