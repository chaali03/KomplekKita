<?php
namespace App\Http\Controllers\Komplek;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class FinanceTemplateController
{
    public function keuangan(Request $request)
    {
        // Build an XLSX template with proper headers matching ImportController
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Keuangan');

        // Required headers in ImportController: Keterangan, Jumlah, Kategori, Tanggal
        // We'll include helpful optional columns too (Jenis, MetodePembayaran, BuktiPembayaran)
        $headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah', 'Jenis', 'MetodePembayaran', 'BuktiPembayaran'];
        $sheet->fromArray($headers, null, 'A1');

        // Example rows
        $today = date('Y-m-d');
        $examples = [
            [$today, 'Iuran Bulanan', 'Iuran Bulanan', 500000, 'pemasukan', 'Transfer', ''],
            [$today, 'Bayar Kebersihan', 'Kebersihan', 200000, 'pengeluaran', 'Tunai', ''],
        ];
        $sheet->fromArray($examples, null, 'A2');

        // Autosize columns
        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Output as XLSX response
        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return new Response(
            $content,
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="template-keuangan.xlsx"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
            ]
        );
    }

    public function warga(Request $request)
    {
        // Build an XLSX template with proper headers matching ImportController
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Warga');

        // Required headers in ImportController: Nama, NIK, Telepon, Alamat, Blok, NoRumah
        // Include optional RT, RW, Status for convenience
        $headers = ['Nama', 'NIK', 'Telepon', 'Alamat', 'Blok', 'NoRumah', 'RT', 'RW', 'Status'];
        $sheet->fromArray($headers, null, 'A1');

        // Example rows
        $examples = [
            ['Budi Santoso', '1234567890123456', '081234567890', 'Jl. Contoh No. 123', 'A', '10', '001', '002', 'Tetap'],
            ['Siti Rahayu', '2345678901234567', '082345678901', 'Jl. Contoh No. 124', 'A', '11', '001', '002', 'Kontrak'],
        ];
        $sheet->fromArray($examples, null, 'A2');

        // Autosize columns
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Output as XLSX response
        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return new Response(
            $content,
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="template-warga.xlsx"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
            ]
        );
    }
}