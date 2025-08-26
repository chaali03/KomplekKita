<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TemplateController extends Controller
{
    public function downloadWarga()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Warga');

        // Header sesuai ekspektasi import & frontend
        $headers = ['Nama', 'NIK', 'Telepon', 'Alamat', 'Blok', 'NoRumah'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValueByColumnAndRow($i + 1, 1, $h);
        }

        // Contoh baris
        $examples = [
            ['Budi Santoso', '3201123456789012', '08123456789', 'Jl. Melati 5', 'A', '12'],
            ['Sari Dewi', '3201987654321098', '08129876543', 'Jl. Kenanga 2', 'B', '7'],
        ];
        $row = 2;
        foreach ($examples as $ex) {
            foreach ($ex as $col => $val) {
                $sheet->setCellValueByColumnAndRow($col + 1, $row, $val);
            }
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'template-warga.xlsx';

        // Output sebagai download
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function downloadKeuangan()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Keuangan');

        // Header sesuai ekspektasi import & frontend
        $headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValueByColumnAndRow($i + 1, 1, $h);
        }

        $examples = [
            ['2025-01-01', 'Iuran', 'Iuran bulanan Januari', '100000'],
            ['2025-01-05', 'Pengeluaran', 'Perbaikan taman', '250000'],
        ];
        $row = 2;
        foreach ($examples as $ex) {
            foreach ($ex as $col => $val) {
                $sheet->setCellValueByColumnAndRow($col + 1, $row, $val);
            }
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'template-keuangan.xlsx';

        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
