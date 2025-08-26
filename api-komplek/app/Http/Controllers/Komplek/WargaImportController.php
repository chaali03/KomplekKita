<?php

namespace App\Http\Controllers\Komplek;

use App\Http\Controllers\Controller;
use App\Http\Requests\Import\UploadWargaRequest;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class WargaImportController extends Controller
{
    public function upload(UploadWargaRequest $request, int $id)
    {
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['message' => 'File tidak ditemukan'], 422);
        }

        $requiredHeaders = ['Nama', 'NIK', 'Telepon', 'Alamat', 'Blok', 'NoRumah'];
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
                    'Nama' => self::getCell($sheet, $idx, 'Nama', $row),
                    'NIK' => self::getCell($sheet, $idx, 'NIK', $row),
                    'Telepon' => self::getCell($sheet, $idx, 'Telepon', $row),
                    'Alamat' => self::getCell($sheet, $idx, 'Alamat', $row),
                    'Blok' => self::getCell($sheet, $idx, 'Blok', $row),
                    'NoRumah' => self::getCell($sheet, $idx, 'NoRumah', $row),
                ];

                // Per-row validations
                $rowErrors = [];
                foreach ($requiredHeaders as $h) {
                    if (!isset($record[$h]) || trim((string) $record[$h]) === '') {
                        $rowErrors[] = "Baris {$row}: Kolom {$h} wajib diisi.";
                    }
                }
                $nikStr = preg_replace('/\D+/', '', (string) ($record['NIK'] ?? ''));
                if ($nikStr === '' || strlen($nikStr) !== 16) {
                    $rowErrors[] = "Baris {$row}: NIK harus 16 digit angka.";
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
        // Count unique row numbers in error messages starting with "Baris N:"
        $rows = [];
        foreach ($errors as $msg) {
            if (preg_match('/Baris\s+(\d+)/', $msg, $m)) {
                $rows[$m[1]] = true;
            }
        }
        return count($rows);
    }
}
