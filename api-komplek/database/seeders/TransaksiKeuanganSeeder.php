<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TransaksiKeuanganSeeder extends Seeder
{
    public function run(): void
    {
        // Seed some pemasukan (+) and pengeluaran (-) for komplek_id = 1
        DB::table('transaksi_keuangan')->updateOrInsert(
            ['id' => 1],
            [
                'komplek_id' => 1,
                'tanggal' => now()->subDays(5)->toDateString(),
                'kategori' => 'pemasukan',
                'keterangan' => 'Iuran warga',
                'jumlah' => 1500000,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        DB::table('transaksi_keuangan')->updateOrInsert(
            ['id' => 2],
            [
                'komplek_id' => 1,
                'tanggal' => now()->subDays(3)->toDateString(),
                'kategori' => 'pengeluaran',
                'keterangan' => 'Kebersihan lingkungan',
                'jumlah' => -500000,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
