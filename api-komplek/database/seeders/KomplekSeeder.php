<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Date;

class KomplekSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('komplek')->updateOrInsert(
            ['id' => 1],
            [
                'nama' => 'Komplek Kita',
                'deskripsi' => 'Komunitas perumahan',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
