<?php

namespace App\Http\Controllers;

use App\Models\Anggaran;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnggaranController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'periode' => ['nullable','string','regex:/^\d{4}-\d{2}$/'],
            'kategori' => ['nullable', Rule::in(['iuran','perbaikan','operasional'])],
        ]);
        $q = Anggaran::query()->where('komplek_id',$data['komplek_id']);
        if (!empty($data['periode'])) $q->where('periode',$data['periode']);
        if (!empty($data['kategori'])) $q->where('kategori',$data['kategori']);
        return $q->orderByDesc('periode')->orderBy('kategori')->paginate(50);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'periode' => ['required','string','regex:/^\d{4}-\d{2}$/'],
            'kategori' => ['required', Rule::in(['iuran','perbaikan','operasional'])],
            'rencana' => ['nullable','numeric','min:0'],
            'realisasi' => ['nullable','numeric','min:0'],
            'catatan' => ['nullable','string'],
        ]);
        $anggaran = Anggaran::create($data);
        return response()->json($anggaran,201);
    }

    public function update(Request $request, int $id)
    {
        $ang = Anggaran::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'periode' => ['sometimes','string','regex:/^\d{4}-\d{2}$/'],
            'kategori' => ['sometimes', Rule::in(['iuran','perbaikan','operasional'])],
            'rencana' => ['sometimes','numeric','min:0'],
            'realisasi' => ['sometimes','numeric','min:0'],
            'catatan' => ['sometimes','nullable','string'],
        ]);
        if ($ang->komplek_id !== (int)$data['komplek_id']) return response()->json(['message'=>'komplek_id mismatch'], 422);
        $ang->fill($data)->save();
        return $ang;
    }

    public function destroy(Request $request, int $id)
    {
        $data = $request->validate(['komplek_id' => ['required','integer','exists:komplek,id']]);
        $ang = Anggaran::where('id',$id)->where('komplek_id',$data['komplek_id'])->firstOrFail();
        $ang->delete();
        return response()->noContent();
    }

    // Public/admin: summary per periode (totals per kategori)
    public function summary(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'periode' => ['nullable','string','regex:/^\d{4}-\d{2}$/'],
        ]);
        $q = Anggaran::query()->where('komplek_id',$data['komplek_id']);
        if (!empty($data['periode'])) $q->where('periode',$data['periode']);
        $rows = $q->selectRaw('kategori, sum(rencana) as rencana, sum(realisasi) as realisasi')
                  ->groupBy('kategori')->get();
        $totalRencana = $rows->sum('rencana');
        $totalRealisasi = $rows->sum('realisasi');
        return response()->json([
            'items' => $rows,
            'total' => [ 'rencana' => (float)$totalRencana, 'realisasi' => (float)$totalRealisasi ]
        ]);
    }
}
