<?php

namespace App\Http\Controllers;

use App\Models\Pengaturan;
use Illuminate\Http\Request;

class PengaturanController extends Controller
{
    // Admin: get all settings for a komplek
    public function index(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $rows = Pengaturan::where('komplek_id',$data['komplek_id'])->get();
        // return as key => value map for convenience
        $map = [];
        foreach ($rows as $r) { $map[$r->key] = $r->value; }
        return response()->json($map);
    }

    // Admin: bulk update settings (upsert key/value json)
    public function update(Request $request)
    {
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'settings' => ['required','array'],
        ]);
        foreach ($data['settings'] as $key => $value) {
            Pengaturan::updateOrCreate(
                ['komplek_id' => $data['komplek_id'], 'key' => $key],
                ['value' => $value]
            );
        }
        return $this->index($request);
    }
}
