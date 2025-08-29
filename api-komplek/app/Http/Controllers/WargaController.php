<?php

namespace App\Http\Controllers;

use App\Models\Warga;
use Illuminate\Http\Request;

class WargaController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'q' => ['nullable','string'],
            'rt' => ['nullable','string'],
            'rw' => ['nullable','string'],
            'status' => ['nullable','in:aktif,pindah,nonaktif'],
            'verified' => ['nullable','in:0,1']
        ]);
        $q = Warga::query()->where('komplek_id', $data['komplek_id']);
        if (!empty($data['q'])) {
            $term = "%".$data['q']."%";
            $q->where(function($w) use ($term){
                $w->where('nama','like',$term)->orWhere('nik','like',$term)->orWhere('alamat','like',$term);
            });
        }
        if (!empty($data['rt'])) $q->where('rt',$data['rt']);
        if (!empty($data['rw'])) $q->where('rw',$data['rw']);
        if (!empty($data['status'])) $q->where('status',$data['status']);
        if (isset($data['verified'])) $q->where('verified',(bool)$data['verified']);
        return $q->latest()->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'nama' => ['required','string','max:255'],
            'nik' => ['required','string','max:16'],
            'telepon' => ['nullable','string','max:50'],
            'alamat' => ['nullable','string','max:255'],
            'blok' => ['nullable','string','max:50'],
            'no_rumah' => ['nullable','string','max:50'],
            'rt' => ['nullable','string','max:5'],
            'rw' => ['nullable','string','max:5'],
            'status' => ['nullable','in:aktif,pindah,nonaktif'],
            'verified' => ['nullable','boolean'],
        ]);
        $warga = Warga::create($data);
        return response()->json($warga, 201);
    }

    public function update(Request $request, int $id)
    {
        $warga = Warga::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'nama' => ['sometimes','string','max:255'],
            'nik' => ['sometimes','string','max:16'],
            'telepon' => ['sometimes','nullable','string','max:50'],
            'alamat' => ['sometimes','nullable','string','max:255'],
            'blok' => ['sometimes','nullable','string','max:50'],
            'no_rumah' => ['sometimes','nullable','string','max:50'],
            'rt' => ['sometimes','nullable','string','max:5'],
            'rw' => ['sometimes','nullable','string','max:5'],
            'status' => ['sometimes','in:aktif,pindah,nonaktif'],
            'verified' => ['sometimes','boolean'],
        ]);
        if ($warga->komplek_id !== (int)$data['komplek_id']) {
            return response()->json(['message'=>'komplek_id mismatch'], 422);
        }
        $warga->fill($data)->save();
        return $warga;
    }

    public function destroy(Request $request, int $id)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $warga = Warga::where('id',$id)->where('komplek_id',$data['komplek_id'])->firstOrFail();
        $warga->delete();
        return response()->noContent();
    }

    // Public: aggregated stats (no PII)
    public function publicStats(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $base = Warga::query()->where('komplek_id',$data['komplek_id']);
        $total = (clone $base)->count();
        $byRtRw = (clone $base)
            ->selectRaw("concat(coalesce(rt,'00'),'/',coalesce(rw,'00')) as rtrw, count(*) as jumlah")
            ->groupBy('rtrw')
            ->get();
        $byStatus = (clone $base)
            ->selectRaw("status, count(*) as jumlah")
            ->groupBy('status')
            ->pluck('jumlah','status');
        $verified = (clone $base)->where('verified',true)->count();
        return response()->json([
            'total'=>$total,
            'byRtRw'=>$byRtRw,
            'byStatus'=>$byStatus,
            'verified'=>$verified,
        ]);
    }
}
