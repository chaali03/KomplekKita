<?php

namespace App\Http\Controllers;

use App\Models\Iuran;
use App\Models\IuranPembayaran;
use App\Models\Warga;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;

class IuranController extends Controller
{
    // POST /api/iuran/generate  (auth)
    public function generate(Request $request)
    {
        $v = Validator::make($request->all(), [
            'komplek_id' => 'required|integer|min:1',
            'periode' => ['required','regex:/^\\d{4}-\\d{2}$/'], // YYYY-MM
            'amount' => 'required|integer|min:0',
        ]);
        if ($v->fails()) {
            return response()->json(['errors' => $v->errors()], 422);
        }
        $data = $v->validated();

        $iuran = Iuran::updateOrCreate(
            ['komplek_id' => $data['komplek_id'], 'periode' => $data['periode']],
            ['amount' => $data['amount']]
        );

        return response()->json(['status' => 'ok', 'iuran' => $iuran]);
    }

    // GET /api/public/iuran/status?komplek_id=..&periode=YYYY-MM
    public function status(Request $request)
    {
        $v = Validator::make($request->all(), [
            'komplek_id' => 'required|integer|min:1',
            'periode' => ['required','regex:/^\\d{4}-\\d{2}$/'],
        ]);
        if ($v->fails()) {
            return response()->json(['errors' => $v->errors()], 422);
        }
        $data = $v->validated();

        $iuran = Iuran::where('komplek_id', $data['komplek_id'])
            ->where('periode', $data['periode'])
            ->first();

        // Base warga list (aktif only if field exists; fallback to all for compatibility)
        $wargaQuery = Warga::query()->where('komplek_id', $data['komplek_id']);
        if (Schema::hasColumn('warga', 'status')) {
            $wargaQuery->where('status', 'aktif');
        }
        $warga = $wargaQuery->orderBy('nama')->get(['id','nama']);

        $paidMap = [];
        if ($iuran) {
            $paid = IuranPembayaran::where('iuran_id', $iuran->id)->pluck('warga_id')->all();
            foreach ($paid as $wid) { $paidMap[(string)$wid] = true; }
        }

        $paidList = [];
        $pendingList = [];
        foreach ($warga as $w) {
            if (isset($paidMap[(string)$w->id])) $paidList[] = $w; else $pendingList[] = $w;
        }

        return response()->json([
            'status' => 'ok',
            'komplek_id' => (int)$data['komplek_id'],
            'periode' => $data['periode'],
            'amount' => (int)($iuran->amount ?? 0),
            'paid' => array_map(fn($x) => ['id'=>$x->id, 'nama'=>$x->nama], $paidList),
            'pending' => array_map(fn($x) => ['id'=>$x->id, 'nama'=>$x->nama], $pendingList),
        ]);
    }

    // POST /api/iuran/mark (auth)
    public function mark(Request $request)
    {
        $v = Validator::make($request->all(), [
            'komplek_id' => 'required|integer|min:1',
            'periode' => ['required','regex:/^\\d{4}-\\d{2}$/'],
            'warga_id' => 'required|integer|min:1',
            'paid' => 'required|boolean',
            'amount' => 'nullable|integer|min:0',
            'method' => 'nullable|string|max:50',
            'paid_at' => 'nullable|date',
        ]);
        if ($v->fails()) {
            return response()->json(['errors' => $v->errors()], 422);
        }
        $data = $v->validated();

        return DB::transaction(function () use ($data) {
            // Ensure iuran exists
            $iuran = Iuran::firstOrCreate(
                ['komplek_id' => $data['komplek_id'], 'periode' => $data['periode']],
                ['amount' => $data['amount'] ?? 0]
            );

            if ($data['paid']) {
                $p = IuranPembayaran::updateOrCreate(
                    ['iuran_id' => $iuran->id, 'warga_id' => $data['warga_id']],
                    [
                        'amount' => $data['amount'] ?? $iuran->amount,
                        'method' => $data['method'] ?? null,
                        'paid_at' => $data['paid_at'] ?? now(),
                    ]
                );
                return response()->json(['status' => 'ok', 'marked' => true, 'pembayaran' => $p]);
            } else {
                IuranPembayaran::where('iuran_id', $iuran->id)->where('warga_id', $data['warga_id'])->delete();
                return response()->json(['status' => 'ok', 'marked' => false]);
            }
        });
    }
}
