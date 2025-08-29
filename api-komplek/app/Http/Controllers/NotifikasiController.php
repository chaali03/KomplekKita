<?php

namespace App\Http\Controllers;

use App\Models\Notifikasi;
use Illuminate\Http\Request;

class NotifikasiController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        return Notifikasi::where('komplek_id',$data['komplek_id'])->latest()->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'judul' => ['required','string','max:255'],
            'isi' => ['nullable','string'],
            'target' => ['nullable','string','max:50'],
            'terkirim_at' => ['nullable','date'],
            'meta' => ['nullable','array'],
        ]);
        $n = Notifikasi::create($data);
        return response()->json($n,201);
    }

    public function update(Request $request, int $id)
    {
        $row = Notifikasi::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'judul' => ['sometimes','string','max:255'],
            'isi' => ['sometimes','nullable','string'],
            'target' => ['sometimes','nullable','string','max:50'],
            'terkirim_at' => ['sometimes','nullable','date'],
            'meta' => ['sometimes','nullable','array'],
        ]);
        if ($row->komplek_id !== (int)$data['komplek_id']) return response()->json(['message'=>'komplek_id mismatch'], 422);
        $row->fill($data)->save();
        return $row;
    }

    public function destroy(Request $request, int $id)
    {
        $data = $request->validate(['komplek_id' => ['required','integer','exists:komplek,id']]);
        $row = Notifikasi::where('id',$id)->where('komplek_id',$data['komplek_id'])->firstOrFail();
        $row->delete();
        return response()->noContent();
    }
}
