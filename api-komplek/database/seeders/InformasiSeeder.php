<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InformasiSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        DB::table('informasi')->updateOrInsert(
            ['id' => 1],
            [
                'komplek_id' => 1,
                'judul' => 'Pengumuman Kerja Bakti',
                'isi' => 'Kerja bakti akan dilaksanakan setiap Minggu pagi.',
                'status' => 'publish',
                'tayang_mulai' => $now->copy()->subDays(1),
                'tayang_selesai' => $now->copy()->addDays(14),
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        DB::table('informasi')->updateOrInsert(
            ['id' => 2],
            [
                'komplek_id' => 1,
                'judul' => 'Laporan Keuangan Bulanan',
                'isi' => 'Ringkasan keuangan bulan ini telah dipublikasikan.',
                'status' => 'publish',
                'tayang_mulai' => $now->copy()->subDays(2),
                'tayang_selesai' => $now->copy()->addDays(28),
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
