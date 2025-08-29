<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        DB::table('program')->updateOrInsert(
            ['id' => 1],
            [
                'komplek_id' => 1,
                'judul' => 'Kerja Bakti Mingguan',
                'deskripsi' => 'Bersih-bersih lingkungan komplek',
                'tanggal_mulai' => $now->copy()->subDays(7),
                'tanggal_selesai' => $now->copy()->addDays(7),
                'status' => 'aktif',
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        DB::table('program')->updateOrInsert(
            ['id' => 2],
            [
                'komplek_id' => 1,
                'judul' => 'Donor Darah',
                'deskripsi' => 'Kegiatan sosial donor darah',
                'tanggal_mulai' => $now->copy()->subDays(30),
                'tanggal_selesai' => $now->copy()->subDays(20),
                'status' => 'selesai',
                'meta' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
