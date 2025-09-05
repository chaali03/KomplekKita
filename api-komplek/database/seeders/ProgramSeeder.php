<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Program;

class ProgramSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $programs = [
            [
                'desc' => 'Program Renovasi Masjid',
                'nominal' => 50000000,
                'info' => 'Program renovasi masjid komplek untuk meningkatkan kenyamanan beribadah',
                'deadline' => '2024-03-31',
                'phone' => '081234567890',
                'rekening' => '1234567890 (BNI)',
                'link_type' => 'wa',
                'link_url' => 'https://wa.me/6281234567890',
                'is_active' => true,
                'metadata' => ['category' => 'renovasi', 'priority' => 'high']
            ],
            [
                'desc' => 'Program Bantuan Pendidikan',
                'nominal' => 25000000,
                'info' => 'Program bantuan pendidikan untuk anak-anak warga komplek yang membutuhkan',
                'deadline' => '2024-02-28',
                'phone' => '081234567891',
                'rekening' => '1234567891 (BCA)',
                'link_type' => 'qris',
                'link_url' => 'https://example.com/qris/education',
                'is_active' => true,
                'metadata' => ['category' => 'pendidikan', 'priority' => 'medium']
            ],
            [
                'desc' => 'Program Bantuan Sosial',
                'nominal' => 15000000,
                'info' => 'Program bantuan sosial untuk warga yang membutuhkan bantuan ekonomi',
                'deadline' => '2024-02-15',
                'phone' => '081234567892',
                'rekening' => '1234567892 (Mandiri)',
                'link_type' => 'wa',
                'link_url' => 'https://wa.me/6281234567892',
                'is_active' => true,
                'metadata' => ['category' => 'sosial', 'priority' => 'high']
            ],
            [
                'desc' => 'Program Perbaikan Jalan',
                'nominal' => 30000000,
                'info' => 'Program perbaikan jalan komplek untuk meningkatkan aksesibilitas',
                'deadline' => '2024-04-30',
                'phone' => '081234567893',
                'rekening' => '1234567893 (BRI)',
                'link_type' => 'qris',
                'link_url' => 'https://example.com/qris/road',
                'is_active' => true,
                'metadata' => ['category' => 'infrastruktur', 'priority' => 'medium']
            ],
            [
                'desc' => 'Program Keamanan Komplek',
                'nominal' => 20000000,
                'info' => 'Program peningkatan keamanan komplek dengan instalasi CCTV dan sistem keamanan',
                'deadline' => '2024-03-15',
                'phone' => '081234567894',
                'rekening' => '1234567894 (BNI)',
                'link_type' => 'wa',
                'link_url' => 'https://wa.me/6281234567894',
                'is_active' => true,
                'metadata' => ['category' => 'keamanan', 'priority' => 'high']
            ]
        ];

        foreach ($programs as $program) {
            Program::create($program);
        }
    }
}