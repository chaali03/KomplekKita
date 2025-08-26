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
        // Structured multi-sheet template: Pemasukan, Pengeluaran, Kas Terkini, Ringkasan Bulanan
        try {
            if (!class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class)) {
                throw new \RuntimeException('PhpSpreadsheet not installed');
            }

            $spreadsheet = new Spreadsheet();

            // Helper to style header range
            $styleHeader = function($sheet, string $range, string $startColor, string $endColor, string $tabColor) {
                $sheet->getStyle($range)->getFont()->setBold(true);
                $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_GRADIENT_LINEAR)
                    ->getStartColor()->setARGB($startColor);
                $sheet->getStyle($range)->getFill()->getEndColor()->setARGB($endColor);
                $sheet->getStyle($range)->getFont()->getColor()->setRGB('FFFFFF');
                $sheet->getStyle($range)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle($range)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
                $sheet->getTabColor()->setRGB($tabColor);
            };

            // Sheet 1: Pemasukan
            $in = $spreadsheet->getActiveSheet();
            $in->setTitle('Pemasukan');
            $inHeaders = ['#','Tanggal','Keterangan','Kategori','Sumber','Jumlah','Bulan','Tahun'];
            $in->fromArray([$inHeaders], null, 'A1');
            $styleHeader($in, 'A1:H1', 'FF059669', 'FF10B981', '10B981');
            $inWidths = [6,16,36,18,14,16,10,10];
            foreach (range('A','H') as $i => $c) { $in->getColumnDimension($c)->setWidth($inWidths[$i]); }
            $in->freezePane('A2');
            $maxRows = 501; // header + 500 rows
            for ($r = 2; $r <= $maxRows; $r++) { $in->setCellValue('A'.$r, '=ROW()-1'); }
            $in->getStyle('A2:A'.$maxRows)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $in->getStyle('B2:B'.$maxRows)->getNumberFormat()->setFormatCode('yyyy-mm-dd');
            $in->getStyle('F2:F'.$maxRows)->getNumberFormat()->setFormatCode('#,##0');
            $in->getStyle('G2:H'.$maxRows)->getNumberFormat()->setFormatCode('0');
            $in->getStyle('A1:H'.$maxRows)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
            // Data validation for Sumber
            if (class_exists(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::class)) {
                for ($r = 2; $r <= $maxRows; $r++) {
                    $dv = $in->getCell('E'.$r)->getDataValidation();
                    $dv->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(false)
                        ->setShowDropDown(true)
                        ->setPromptTitle('Sumber')
                        ->setPrompt('Pilih: Kas atau Iuran')
                        ->setFormula1('"Kas,Iuran"');
                }
            }

            // Sheet 2: Pengeluaran
            $out = $spreadsheet->createSheet();
            $out->setTitle('Pengeluaran');
            $outHeaders = ['#','Tanggal','Keterangan','Kategori','Sumber','Jumlah','Bulan','Tahun'];
            $out->fromArray([$outHeaders], null, 'A1');
            $styleHeader($out, 'A1:H1', 'FFB91C1C', 'FFEF4444', 'EF4444');
            foreach (range('A','H') as $i => $c) { $out->getColumnDimension($c)->setWidth($inWidths[$i]); }
            $out->freezePane('A2');
            for ($r = 2; $r <= $maxRows; $r++) { $out->setCellValue('A'.$r, '=ROW()-1'); }
            $out->getStyle('A2:A'.$maxRows)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $out->getStyle('B2:B'.$maxRows)->getNumberFormat()->setFormatCode('yyyy-mm-dd');
            $out->getStyle('F2:F'.$maxRows)->getNumberFormat()->setFormatCode('#,##0');
            $out->getStyle('G2:H'.$maxRows)->getNumberFormat()->setFormatCode('0');
            $out->getStyle('A1:H'.$maxRows)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
            if (class_exists(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::class)) {
                for ($r = 2; $r <= $maxRows; $r++) {
                    $dv = $out->getCell('E'.$r)->getDataValidation();
                    $dv->setType(DataValidation::TYPE_LIST)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setAllowBlank(false)
                        ->setShowDropDown(true)
                        ->setPromptTitle('Sumber')
                        ->setPrompt('Pilih: Kas atau Iuran')
                        ->setFormula1('"Kas,Iuran"');
                }
            }

            // Sheet 3: Kas Terkini
            $kas = $spreadsheet->createSheet();
            $kas->setTitle('Kas Terkini');
            $kasHeaders = ['Bulan','Tahun','TanggalUpdate','SaldoKas','Catatan'];
            $kas->fromArray([$kasHeaders], null, 'A1');
            $styleHeader($kas, 'A1:E1', 'FF0EA5E9', 'FF38BDF8', '0EA5E9');
            $kasWidths = [10,10,16,18,40];
            foreach (range('A','E') as $i => $c) { $kas->getColumnDimension($c)->setWidth($kasWidths[$i]); }
            $kas->freezePane('A2');
            $kas->getStyle('C2:C200')->getNumberFormat()->setFormatCode('yyyy-mm-dd');
            $kas->getStyle('D2:D200')->getNumberFormat()->setFormatCode('#,##0');
            $kas->getStyle('A1:E200')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');
            if (class_exists(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::class)) {
                for ($r = 2; $r <= 200; $r++) {
                    $dvB = $kas->getCell('A'.$r)->getDataValidation();
                    $dvB->setType(DataValidation::TYPE_WHOLE)
                        ->setOperator(DataValidation::OPERATOR_BETWEEN)
                        ->setFormula1('1')->setFormula2('12')
                        ->setAllowBlank(false)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setErrorTitle('Bulan salah')
                        ->setError('Isi angka 1-12');
                    $dvT = $kas->getCell('B'.$r)->getDataValidation();
                    $dvT->setType(DataValidation::TYPE_WHOLE)
                        ->setOperator(DataValidation::OPERATOR_BETWEEN)
                        ->setFormula1('2000')->setFormula2('2100')
                        ->setAllowBlank(false)
                        ->setErrorStyle(DataValidation::STYLE_STOP)
                        ->setErrorTitle('Tahun salah')
                        ->setError('Isi tahun 4 digit');
                }
            }

            // Sheet 4: Ringkasan Bulanan
            $sum = $spreadsheet->createSheet();
            $sum->setTitle('Ringkasan Bulanan');
            // Tahun selector
            $sum->setCellValue('A1', 'Tahun:');
            $sum->setCellValue('B1', date('Y'));
            $sum->getStyle('A1')->getFont()->setBold(true);
            $sum->getColumnDimension('A')->setWidth(14);
            $sum->getColumnDimension('B')->setWidth(10);
            $sum->fromArray([
                ['Bulan','Total Pemasukan','Total Pengeluaran','Saldo Bersih','Saldo Kas Terkini'],
            ], null, 'A3');
            $styleHeader($sum, 'A3:E3', 'FF111827', 'FF374151', '111827');
            $sum->getColumnDimension('A')->setWidth(12);
            $sum->getColumnDimension('B')->setWidth(20);
            $sum->getColumnDimension('C')->setWidth(22);
            $sum->getColumnDimension('D')->setWidth(18);
            $sum->getColumnDimension('E')->setWidth(22);
            // Fill months 1..12 and formulas using SUMIFS against sheets
            for ($m = 1; $m <= 12; $m++) {
                $row = 3 + $m; // rows 4..15
                $sum->setCellValue('A'.$row, $m);
                // Total Pemasukan by Bulan & Tahun
                $sum->setCellValue('B'.$row, sprintf('=SUMIFS(Pemasukan!F:F,Pemasukan!G:G,A%d,Pemasukan!H:H,$B$1)', $row));
                // Total Pengeluaran by Bulan & Tahun
                $sum->setCellValue('C'.$row, sprintf('=SUMIFS(Pengeluaran!F:F,Pengeluaran!G:G,A%d,Pengeluaran!H:H,$B$1)', $row));
                // Saldo Bersih
                $sum->setCellValue('D'.$row, '=B'.$row.'-C'.$row);
                // Saldo Kas Terkini for month (latest in Kas sheet for that month/year)
                // Use LOOKUP with 2 to get the last matching SaldoKas in 'Kas Terkini' sheet
                $sum->setCellValue('E'.$row, sprintf("=IFERROR(LOOKUP(2,1/('Kas Terkini'!A:A=A%d)/('Kas Terkini'!B:B=$B$1),'Kas Terkini'!D:D),\"\")", $row));
            }
            $sum->getStyle('B4:E15')->getNumberFormat()->setFormatCode('#,##0');
            $sum->getStyle('A4:E15')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');

            // Instruction sheet
            $guide = $spreadsheet->createSheet();
            $guide->setTitle('Petunjuk');
            $guide->setCellValue('A1', 'Petunjuk Pengisian Template Keuangan (Multi-Sheet)');
            $guide->mergeCells('A1:E1');
            $guide->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            $guide->fromArray([
                ['Sheet','Kolom','Format','Catatan','Wajib'],
                ['Pemasukan','Tanggal','yyyy-mm-dd','Tanggal transaksi','Ya'],
                ['Pemasukan','Sumber','Kas/Iuran','Pilih dari dropdown','Ya'],
                ['Pemasukan','Jumlah','Angka','# tanpa pemisah','Ya'],
                ['Pengeluaran','Tanggal','yyyy-mm-dd','Tanggal transaksi','Ya'],
                ['Pengeluaran','Sumber','Kas/Iuran','Pilih dari dropdown','Ya'],
                ['Pengeluaran','Jumlah','Angka','# tanpa pemisah','Ya'],
                ['Kas Terkini','Bulan/Tahun','1-12 / YYYY','Isi per periode','Ya'],
                ['Kas Terkini','SaldoKas','Angka','Saldo kas per update','Ya'],
                ['Ringkasan Bulanan','Tahun','Teks/Angka','Ubah sel B1 untuk tahun','-'],
            ], null, 'A3');
            foreach (range('A','E') as $c) { $guide->getColumnDimension($c)->setWidth(20); }
            $guide->getStyle('A3:E3')->getFont()->setBold(true);
            $guide->getStyle('A3:E20')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E5E7EB');

            // Set active sheet to Pemasukan
            $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($in));

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
            // Fallback to a simple CSV for Pemasukan
            $headers = ['#','Tanggal','Keterangan','Kategori','Sumber','Jumlah','Bulan','Tahun'];
            $csv = implode(',', $headers)."\n";
            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="template-keuangan.csv"',
            ]);
        }
    }
}
