<?php

namespace App\Http\Controllers;

use App\Models\TransaksiKeuangan;
use Illuminate\Http\Request;

class TransaksiKeuanganController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'dari' => ['nullable','date'],
            'sampai' => ['nullable','date','after_or_equal:dari'],
            'kategori' => ['nullable','string','max:100'],
        ]);
        $q = TransaksiKeuangan::query()->where('komplek_id',$data['komplek_id']);
        if (!empty($data['dari'])) $q->whereDate('tanggal','>=',$data['dari']);
        if (!empty($data['sampai'])) $q->whereDate('tanggal','<=',$data['sampai']);
        if (!empty($data['kategori'])) $q->where('kategori',$data['kategori']);
        return $q->orderByDesc('tanggal')->orderByDesc('id')->paginate(50);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'tanggal' => ['required','date'],
            'kategori' => ['required','string','max:100'],
            'keterangan' => ['nullable','string','max:255'],
            'jumlah' => ['required','numeric'],
        ]);
        $row = TransaksiKeuangan::create($data);
        return response()->json($row,201);
    }

    public function update(Request $request, int $id)
    {
        $row = TransaksiKeuangan::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'tanggal' => ['sometimes','date'],
            'kategori' => ['sometimes','string','max:100'],
            'keterangan' => ['sometimes','nullable','string','max:255'],
            'jumlah' => ['sometimes','numeric'],
        ]);
        if ($row->komplek_id !== (int)$data['komplek_id']) return response()->json(['message'=>'komplek_id mismatch'],422);
        $row->fill($data)->save();
        return $row;
    }

    public function destroy(Request $request, int $id)
    {
        $data = $request->validate(['komplek_id' => ['required','integer','exists:komplek,id']]);
        $row = TransaksiKeuangan::where('id',$id)->where('komplek_id',$data['komplek_id'])->firstOrFail();
        $row->delete();
        return response()->noContent();
    }

    // Public/admin: summary untuk laporan (by tanggal dan kategori)
    public function summary(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'dari' => ['nullable','date'],
            'sampai' => ['nullable','date','after_or_equal:dari'],
        ]);
        $q = TransaksiKeuangan::query()->where('komplek_id',$data['komplek_id']);
        if (!empty($data['dari'])) $q->whereDate('tanggal','>=',$data['dari']);
        if (!empty($data['sampai'])) $q->whereDate('tanggal','<=',$data['sampai']);

        $byTanggal = (clone $q)
            ->selectRaw('tanggal, sum(jumlah) as total')
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();
        $byKategori = (clone $q)
            ->selectRaw('kategori, sum(jumlah) as total')
            ->groupBy('kategori')
            ->orderBy('kategori')
            ->get();
        $total = (clone $q)->sum('jumlah');

        return response()->json([
            'byTanggal' => $byTanggal,
            'byKategori' => $byKategori,
            'total' => (float)$total,
        ]);
    }
}
