<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;

class TemplateController extends Controller
{
    public function downloadWarga()
    {
        $headers = ['#', 'Nama', 'NIK', 'Telepon', 'Alamat', 'Blok', 'NoRumah'];
        // Blank template (no example rows)
        try {
            if (!class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class)) {
                throw new \RuntimeException('PhpSpreadsheet not installed');
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Data Warga');

            // Set headers (with leading '#')
            $col = 'A';
            foreach ($headers as $h) {
                $sheet->setCellValue($col.'1', $h);
                $col++;
            }

            // Header style (Warga: purple/blue)
            $headerRange = 'A1:G1';
            $sheet->getStyle($headerRange)->getFont()->setBold(true);
            // Gradient header fill and white text
            $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_GRADIENT_LINEAR)
                ->getStartColor()->setARGB('FF6D28D9');
            $sheet->getStyle($headerRange)->getFill()->getEndColor()->setARGB('FF60A5FA');
            $sheet->getStyle($headerRange)->getFont()->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('C7D2FE');
            // Tab color for Warga sheet
            $sheet->getTabColor()->setRGB('6366F1');

            // Column widths
            $widths = [6, 20, 22, 16, 28, 10, 10];
            foreach (range('A', 'G') as $i => $c) {
                $sheet->getColumnDimension($c)->setWidth($widths[$i]);
            }

            // Leave rows empty; styled header with grid-ready area
            $rowIdx = 2; // first data row reserved
            // Freeze header row
            $sheet->freezePane('A2');
            // Auto-numbering in '#' column for first 100 rows
            for ($r = 2; $r <= 101; $r++) {
                $sheet->setCellValue('A'.$r, '=ROW()-1');
            }
            $sheet->getStyle('A2:A101')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            // Clearer borders for first 100 rows (including header)
            $dataRange = 'A1:G101';
            $sheet->getStyle($dataRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
            // Autofilter on header
            $sheet->setAutoFilter('A1:G1');

            // Instruction sheet
            $guide = $spreadsheet->createSheet(1);
            $guide->setTitle('Petunjuk');
            $guide->setCellValue('A1', 'Petunjuk Pengisian Template Data Warga');
            $guide->mergeCells('A1:D1');
            $guide->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            $guide->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $guide->fromArray([
                ['Kolom', 'Wajib', 'Format', 'Catatan'],
                ['Nama', 'Ya', 'Teks', 'Nama lengkap warga'],
                ['NIK', 'Ya', '16 digit', 'Hanya angka, tanpa spasi/tanda baca'],
                ['Telepon', 'Opsional', '08xxxxxxxxxx', 'Tanpa spasi/tanda baca'],
                ['Alamat', 'Ya', 'Teks', 'Alamat jalan lengkap'],
                ['Blok', 'Ya', 'Teks/1-3 huruf', 'Contoh: A, B, C1'],
                ['NoRumah', 'Ya', 'Angka', 'Nomor rumah, contoh: 12'],
            ], null, 'A3');
            $guide->getColumnDimension('A')->setWidth(18);
            $guide->getColumnDimension('B')->setWidth(12);
            $guide->getColumnDimension('C')->setWidth(16);
            $guide->getColumnDimension('D')->setWidth(60);
            $guide->getStyle('A3:D3')->getFont()->setBold(true);
            $guide->getStyle('A3:D3')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('F1F5F9');
            $guide->getStyle('A3:D9')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');

            // Vertical template sheet (user-friendly entry form)
            $vertical = $spreadsheet->createSheet();
            $vertical->setTitle('Template Vertikal');
            $vertical->fromArray([
                ['Field', 'Nilai'],
                ['Nama', ''],
                ['NIK', ''],
                ['Telepon', ''],
                ['Alamat', ''],
                ['Blok', ''],
                ['NoRumah', ''],
            ], null, 'A1');
            // Style vertical header and columns
            $vertical->getStyle('A1:B1')->getFont()->setBold(true);
            $vertical->getStyle('A1:B1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('EEF2FF');
            $vertical->getStyle('A1:B1')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('C7D2FE');
            $vertical->getColumnDimension('A')->setWidth(18);
            $vertical->getColumnDimension('B')->setWidth(40);
            // Light borders for form area
            $vertical->getStyle('A1:B7')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_HAIR);
            // Ensure horizontal sheet is the primary visible and active sheet
            $dataSheet = $spreadsheet->getSheetByName('Data Warga');
            if ($dataSheet) {
                $dataSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_VISIBLE);
                $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($dataSheet));
            }
            // Hide vertical sheet to avoid confusion
            $vertical->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);

            // Output
            $writer = new Xlsx($spreadsheet);
            ob_start();
            $writer->save('php://output');
            $xlsxData = ob_get_clean();
            return response($xlsxData, 200, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="template-warga.xlsx"',
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Throwable $e) {
            // Fallback to CSV template (headers only) to avoid 500
            $csv = implode(',', $headers)."\n";
            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="template-warga.csv"',
            ]);
        }
    }

    public function downloadKeuangan()
    {
        $headers = ['#', 'JenisTransaksi', 'Sumber', 'Tanggal', 'Keterangan', 'Jumlah', 'Bulan', 'Tahun', 'SaldoKasSekarang'];
        // Blank template (no example rows)
        try {
            if (!class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class)) {
                throw new \RuntimeException('PhpSpreadsheet not installed');
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Data Keuangan');

            // Set headers
            $col = 'A';
            foreach ($headers as $h) {
                $sheet->setCellValue($col.'1', $h);
                $col++;
            }

            // Header style (Keuangan: green gradient)
            $headerRange = 'A1:I1';
            $sheet->getStyle($headerRange)->getFont()->setBold(true);
            // Gradient header fill and white text
            $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_GRADIENT_LINEAR)
                ->getStartColor()->setARGB('FF059669');
            $sheet->getStyle($headerRange)->getFill()->getEndColor()->setARGB('FF10B981');
            $sheet->getStyle($headerRange)->getFont()->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('C7D2FE');
            // Tab color for Keuangan sheet
            $sheet->getTabColor()->setRGB('10B981');

            // Column widths
            $widths = [6, 18, 12, 16, 32, 16, 10, 10, 20];
            foreach (range('A', 'I') as $i => $c) {
                $sheet->getColumnDimension($c)->setWidth($widths[$i]);
            }

            // Leave rows empty; styled header with grid-ready area
            $rowIdx = 2;
            // Freeze header row
            $sheet->freezePane('A2');
            // Limit painted area to first 500 rows for performance
            $maxRows = 501; // header + 500 rows
            // Auto-numbering in '#' column
            for ($r = 2; $r <= $maxRows; $r++) {
                $sheet->setCellValue('A'.$r, '=ROW()-1');
            }
            $sheet->getStyle('A2:A'.$maxRows)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Set validations: JenisTransaksi (B) and Sumber (C)
            $hasDV = class_exists(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::class);
            if ($hasDV) {
                for ($r = 2; $r <= $maxRows; $r++) {
                    $dv1 = $sheet->getCell('B'.$r)->getDataValidation();
                    $dv1->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(false)
                        ->setShowInputMessage(true)
                        ->setShowErrorMessage(true)
                        ->setShowDropDown(true)
                        ->setErrorTitle('Input salah')
                        ->setError('Pilih salah satu dari daftar')
                        ->setPromptTitle('Jenis Transaksi')
                        ->setPrompt('Pilih: Pemasukan atau Pengeluaran')
                        ->setFormula1('"Pemasukan,Pengeluaran"');

                    $dv2 = $sheet->getCell('C'.$r)->getDataValidation();
                    $dv2->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(false)
                        ->setShowInputMessage(true)
                        ->setShowErrorMessage(true)
                        ->setShowDropDown(true)
                        ->setErrorTitle('Input salah')
                        ->setError('Pilih salah satu dari daftar')
                        ->setPromptTitle('Sumber')
                        ->setPrompt('Pilih: Kas atau Iuran')
                        ->setFormula1('"Kas,Iuran"');
                }
            }

            // Set date/number formats for input area (first 500 rows)
            $sheet->getStyle('D2:D'.$maxRows)->getNumberFormat()->setFormatCode('yyyy-mm-dd');
            $sheet->getStyle('F2:F'.$maxRows)->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle('G2:H'.$maxRows)->getNumberFormat()->setFormatCode('0');
            $sheet->getStyle('I2:I'.$maxRows)->getNumberFormat()->setFormatCode('#,##0');

            // Clearer borders for first 500 rows (including header) and autofilter on header
            $dataRange = 'A1:I'.$maxRows;
            $sheet->getStyle($dataRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
            $sheet->setAutoFilter('A1:I1');

            // Instruction sheet
            $guide = $spreadsheet->createSheet(1);
            $guide->setTitle('Petunjuk');
            $guide->setCellValue('A1', 'Petunjuk Pengisian Template Data Keuangan');
            $guide->mergeCells('A1:D1');
            $guide->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            $guide->fromArray([
                ['Kolom', 'Wajib', 'Format', 'Catatan'],
                ['JenisTransaksi', 'Ya', 'Pemasukan/Pengeluaran', 'Wajib pilih salah satu'],
                ['Sumber', 'Ya', 'Kas/Iuran', 'Hanya Kas atau Iuran'],
                ['Tanggal', 'Ya', 'yyyy-mm-dd', 'Contoh: 2025-01-01'],
                ['Keterangan', 'Ya', 'Teks', 'Deskripsi singkat transaksi'],
                ['Jumlah', 'Ya', 'Angka', 'Tanpa pemisah titik/koma'],
                ['Bulan', 'Ya', '1-12', 'Semua baris harus sama'],
                ['Tahun', 'Ya', 'YYYY', 'Semua baris harus sama'],
                ['SaldoKasSekarang', 'Ya', 'Angka', 'Saldo kas saat ini; semua baris harus sama'],
            ], null, 'A3');
            $guide->getColumnDimension('A')->setWidth(18);
            $guide->getColumnDimension('B')->setWidth(12);
            $guide->getColumnDimension('C')->setWidth(16);
            $guide->getColumnDimension('D')->setWidth(60);
            $guide->getStyle('A3:D3')->getFont()->setBold(true);
            $guide->getStyle('A3:D11')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');

            // Vertical template sheet (kept but hidden)
            $vertical = $spreadsheet->createSheet();
            $vertical->setTitle('Template Vertikal');
            $vertical->fromArray([
                ['Field', 'Nilai'],
                ['JenisTransaksi', 'Pemasukan/Pengeluaran'],
                ['Sumber', 'Kas/Iuran'],
                ['Tanggal', 'yyyy-mm-dd'],
                ['Keterangan', ''],
                ['Jumlah', ''],
                ['Bulan', '1-12'],
                ['Tahun', 'YYYY'],
                ['SaldoKasSekarang', ''],
            ], null, 'A1');
            // Style vertical header and columns
            $vertical->getStyle('A1:B1')->getFont()->setBold(true);
            $vertical->getStyle('A1:B1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('EEF2FF');
            $vertical->getStyle('A1:B1')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('C7D2FE');
            $vertical->getColumnDimension('A')->setWidth(18);
            $vertical->getColumnDimension('B')->setWidth(40);
            // Light borders for form area
            $vertical->getStyle('A1:B10')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_HAIR);
            // Ensure horizontal active and vertical hidden
            $dataSheet = $spreadsheet->getSheetByName('Data Keuangan');
            if ($dataSheet) {
                $dataSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_VISIBLE);
                $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($dataSheet));
            }
            $vertical->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);

            // Output
            $writer = new Xlsx($spreadsheet);
            ob_start();
            $writer->save('php://output');
            $xlsxData = ob_get_clean();
            return response($xlsxData, 200, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="template-keuangan.xlsx"',
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Throwable $e) {
            // Fallback to CSV template (headers only) to avoid 500
            $csv = implode(',', $headers)."\n";
            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="template-keuangan.csv"',
            ]);
        }
    }
}
