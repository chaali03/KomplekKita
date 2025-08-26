<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use App\Http\Requests\Import\UploadKeuanganRequest;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class KeuanganImportController extends Controller
{
    public function upload(UploadKeuanganRequest $request, int $id)
    {
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['message' => 'File tidak ditemukan'], 422);
        }

        $requiredHeaders = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'];
        $errors = [];
        $rowsOut = [];

        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getSheet(0);
            $highestRow = $sheet->getHighestRow();
            $highestColumn = $sheet->getHighestColumn();
            $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);

            // Read header row (row 1)
            $headers = [];
            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $headers[] = trim((string) $sheet->getCellByColumnAndRow($col, 1)->getValue());
            }

            // Validate required headers presence
            $missing = array_values(array_diff($requiredHeaders, $headers));
            if (count($missing) > 0) {
                $errors[] = 'Header wajib tidak lengkap: ' . implode(', ', $missing) . '.';
            }

            // Map header indices
            $idx = array_flip($headers);

            // Iterate data rows starting row 2
            for ($row = 2; $row <= $highestRow; $row++) {
                // Skip completely empty rows
                $isEmpty = true;
                for ($col = 1; $col <= $highestColumnIndex; $col++) {
                    $val = $sheet->getCellByColumnAndRow($col, $row)->getCalculatedValue();
                    if ($val !== null && $val !== '') { $isEmpty = false; break; }
                }
                if ($isEmpty) { continue; }

                $record = [
                    'Tanggal' => self::getCell($sheet, $idx, 'Tanggal', $row),
                    'Keterangan' => self::getCell($sheet, $idx, 'Keterangan', $row),
                    'Kategori' => self::getCell($sheet, $idx, 'Kategori', $row),
                    'Jumlah' => self::getCell($sheet, $idx, 'Jumlah', $row),
                ];

                // Per-row validations
                $rowErrors = [];
                foreach ($requiredHeaders as $h) {
                    if (!isset($record[$h]) || trim((string) $record[$h]) === '') {
                        $rowErrors[] = "Baris {$row}: Kolom {$h} wajib diisi.";
                    }
                }

                // Tanggal validation (YYYY-MM-DD)
                $date = (string) ($record['Tanggal'] ?? '');
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    $rowErrors[] = "Baris {$row}: Tanggal harus format YYYY-MM-DD.";
                }

                // Kategori validation (Pemasukan | Pengeluaran)
                $kategori = trim((string) ($record['Kategori'] ?? ''));
                $allowed = ['Pemasukan', 'Pengeluaran'];
                if ($kategori !== '' && !in_array($kategori, $allowed, true)) {
                    $rowErrors[] = "Baris {$row}: Kategori harus 'Pemasukan' atau 'Pengeluaran'.";
                }

                // Jumlah numeric > 0
                $jumlahRaw = (string) ($record['Jumlah'] ?? '');
                $jumlah = is_numeric($jumlahRaw) ? (float) $jumlahRaw : null;
                if ($jumlah === null || $jumlah <= 0) {
                    $rowErrors[] = "Baris {$row}: Jumlah harus angka > 0.";
                } else {
                    // normalize to number
                    $record['Jumlah'] = $jumlah;
                }

                if (count($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                }

                $rowsOut[] = $record;
            }

            $summary = [
                'total' => count($rowsOut),
                'success' => max(0, count($rowsOut) - self::countRowErrors($errors)),
                'failed' => self::countRowErrors($errors),
            ];

            return response()->json([
                'status' => empty($errors) ? 'ok' : 'invalid',
                'komplek_id' => $id,
                'data' => $rowsOut,
                'errors' => $errors,
                'summary' => $summary,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal memproses file Excel',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    private static function getCell($sheet, array $idx, string $header, int $row)
    {
        if (!isset($idx[$header])) return null;
        $colIndex = $idx[$header] + 1; // headers are 0-based in array_flip
        return $sheet->getCellByColumnAndRow($colIndex, $row)->getFormattedValue();
    }

    private static function countRowErrors(array $errors): int
    {
        $rows = [];
        foreach ($errors as $msg) {
            if (preg_match('/Baris\s+(\d+)/', $msg, $m)) {
                $rows[$m[1]] = true;
            }
        }
        return count($rows);
    }
}
