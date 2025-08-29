<?php

namespace App\Http\Controllers;

use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProgramController extends Controller
{
    // Admin: list
    public function index(Request $request)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'status' => ['nullable', Rule::in(['draft','aktif','selesai','dibatalkan'])],
        ]);
        $q = Program::query()->where('komplek_id', $validated['komplek_id']);
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
            'deskripsi' => ['nullable','string'],
            'tanggal_mulai' => ['nullable','date'],
            'tanggal_selesai' => ['nullable','date','after_or_equal:tanggal_mulai'],
            'status' => ['required', Rule::in(['draft','aktif','selesai','dibatalkan'])],
            'meta' => ['nullable','array'],
        ]);
        $program = Program::create($data);
        return response()->json($program, 201);
    }

    // Admin: update
    public function update(Request $request, int $id)
    {
        $program = Program::findOrFail($id);
        $data = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
            'judul' => ['sometimes','string','max:255'],
            'deskripsi' => ['sometimes','nullable','string'],
            'tanggal_mulai' => ['sometimes','nullable','date'],
            'tanggal_selesai' => ['sometimes','nullable','date','after_or_equal:tanggal_mulai'],
            'status' => ['sometimes', Rule::in(['draft','aktif','selesai','dibatalkan'])],
            'meta' => ['sometimes','nullable','array'],
        ]);
        if ($program->komplek_id !== (int)$data['komplek_id']) {
            return response()->json(['message'=>'komplek_id mismatch'], 422);
        }
        $program->fill($data)->save();
        return $program;
    }

    // Admin: delete
    public function destroy(Request $request, int $id)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $program = Program::where('id',$id)->where('komplek_id',$validated['komplek_id'])->firstOrFail();
        $program->delete();
        return response()->noContent();
    }

    // Public: list aktif/selesai, optional schedule filter auto
    public function publicIndex(Request $request)
    {
        $validated = $request->validate([
            'komplek_id' => ['required','integer','exists:komplek,id'],
        ]);
        $now = now();
        $q = Program::query()
            ->where('komplek_id', $validated['komplek_id'])
            ->whereIn('status', ['aktif','selesai'])
            ->where(function($qq) use ($now) {
                $qq->whereNull('tanggal_mulai')->orWhere('tanggal_mulai','<=',$now);
            })
            ->where(function($qq) use ($now) {
                $qq->whereNull('tanggal_selesai')->orWhere('tanggal_selesai','>=',$now);
            })
            ->orderByDesc('tanggal_mulai')
            ->orderByDesc('id');
        return $q->paginate(20);
    }
}
