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
            $ext = strtolower($file->getClientOriginalExtension() ?? '');
            if ($ext === 'csv') {
                // CSV PARSE PATH
                $path = $file->getPathname();
                $handle = fopen($path, 'r');
                if ($handle === false) {
                    throw new \RuntimeException('Tidak bisa membuka file CSV');
                }
                // Auto-detect delimiter by peeking first line
                $firstLine = fgets($handle);
                if ($firstLine === false) { $firstLine = ''; }
                $commaCount = substr_count($firstLine, ',');
                $semiCount = substr_count($firstLine, ';');
                $delim = ($semiCount > $commaCount) ? ';' : ',';
                // Rewind and read header with detected delimiter
                rewind($handle);
                $headers = fgetcsv($handle, 0, $delim);
                if (!$headers) { $headers = []; }
                // Strip BOM from first header cell if present and normalize encoding/trim
                if (isset($headers[0])) {
                    $headers[0] = preg_replace("/^\xEF\xBB\xBF/", '', (string)$headers[0]);
                }
                $headers = array_map(function ($h) {
                    $s = (string)$h;
                    // Convert to UTF-8 if possible
                    if (function_exists('mb_convert_encoding')) {
                        $s = mb_convert_encoding($s, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
                    }
                    return trim($s);
                }, $headers);

                // Normalize header keys and build alias map to required keys
                $normalize = function(string $s) {
                    $s = mb_strtolower($s, 'UTF-8');
                    $s = preg_replace('/\s+|_/u', '', $s);
                    return $s ?? '';
                };
                $aliasToKey = [
                    'nama' => 'Nama',
                    'nik' => 'NIK',
                    'telepon' => 'Telepon', 'telp' => 'Telepon', 'notelp' => 'Telepon', 'nohp' => 'Telepon', 'handphone' => 'Telepon', 'hp' => 'Telepon',
                    'alamat' => 'Alamat',
                    'blok' => 'Blok',
                    'norumah' => 'NoRumah', 'norum' => 'NoRumah', 'norumahno' => 'NoRumah', 'norumaH' => 'NoRumah', 'norumaHno' => 'NoRumah', 'nor' => 'NoRumah',
                    'norumaHnorumaH' => 'NoRumah',
                    'norumahnor' => 'NoRumah', 'norumaHnor' => 'NoRumah',
                    // Phrases with spaces will normalize to these keys, e.g., "no rumah" => "norumah"
                ];
                // Build header index mapping to canonical keys
                $idx = [];
                foreach ($headers as $i => $h) {
                    $norm = $normalize($h);
                    if (isset($aliasToKey[$norm])) {
                        $idx[$aliasToKey[$norm]] = $i;
                    } else {
                        // if exact match to required header name after trim
                        if (in_array($h, $requiredHeaders, true)) {
                            $idx[$h] = $i;
                        }
                    }
                }

                // Validate required headers
                $present = array_keys($idx);
                $missing = array_values(array_diff($requiredHeaders, $present));
                if (count($missing) > 0) {
                    $errors[] = 'Header wajib tidak lengkap: ' . implode(', ', $missing) . '.';
                }

                $rowNum = 1; // header line
                while (($data = fgetcsv($handle, 0, $delim)) !== false) {
                    $rowNum++;
                    // Skip empty rows
                    $isEmpty = true;
                    foreach ($data as $v) { if ($v !== null && $v !== '') { $isEmpty = false; break; } }
                    if ($isEmpty) { continue; }

                    // Normalize encoding for each data value
                    foreach ($data as $k => $v) {
                        if (!is_string($v)) continue;
                        if (function_exists('mb_convert_encoding')) {
                            $data[$k] = mb_convert_encoding($v, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
                        }
                    }

                    $get = function(string $key) use ($idx, $data) {
                        if (!isset($idx[$key])) return null;
                        $i = $idx[$key];
                        return $data[$i] ?? null;
                    };

                    $record = [
                        'Nama' => $get('Nama'),
                        'NIK' => $get('NIK'),
                        'Telepon' => $get('Telepon'),
                        'Alamat' => $get('Alamat'),
                        'Blok' => $get('Blok'),
                        'NoRumah' => $get('NoRumah'),
                    ];

                    $rowErrors = [];
                    foreach ($requiredHeaders as $h) {
                        if (!isset($record[$h]) || trim((string)$record[$h]) === '') {
                            $rowErrors[] = "Baris {$rowNum}: Kolom {$h} wajib diisi.";
                        }
                    }
                    $nikStr = preg_replace('/\D+/', '', (string) ($record['NIK'] ?? ''));
                    if ($nikStr === '' || strlen($nikStr) !== 16) {
                        $rowErrors[] = "Baris {$rowNum}: NIK harus 16 digit angka.";
                    }

                    if (count($rowErrors)) { $errors = array_merge($errors, $rowErrors); }
                    $rowsOut[] = $record;
                }
                fclose($handle);
            } else {
                // EXCEL PARSE PATH (XLSX/XLS)
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
            // Final fallback: try parse as CSV regardless of extension, then return 200 with JSON
            try {
                $path = $file->getPathname();
                $handle = @fopen($path, 'r');
                if ($handle !== false) {
                    $firstLine = fgets($handle);
                    if ($firstLine === false) { $firstLine = ''; }
                    $commaCount = substr_count($firstLine, ',');
                    $semiCount = substr_count($firstLine, ';');
                    $delim = ($semiCount > $commaCount) ? ';' : ',';
                    rewind($handle);
                    $headers = fgetcsv($handle, 0, $delim) ?: [];
                    if (isset($headers[0])) {
                        $headers[0] = preg_replace("/^\xEF\xBB\xBF/", '', (string)$headers[0]);
                    }
                    $headers = array_map(function ($h) { return trim((string)$h); }, $headers);

                    // Build direct mapping (no alias here to keep it short in fallback)
                    $idx = [];
                    foreach ($headers as $i => $h) {
                        if (in_array($h, $requiredHeaders, true)) { $idx[$h] = $i; }
                    }
                    $present = array_keys($idx);
                    $missing = array_values(array_diff($requiredHeaders, $present));
                    if (count($missing) > 0) {
                        $errors[] = 'Header wajib tidak lengkap: ' . implode(', ', $missing) . '.';
                    }
                    $rowNum = 1;
                    while (($data = fgetcsv($handle, 0, $delim)) !== false) {
                        $rowNum++;
                        $isEmpty = true;
                        foreach ($data as $v) { if ($v !== null && $v !== '') { $isEmpty = false; break; } }
                        if ($isEmpty) { continue; }
                        $get = function(string $key) use ($idx, $data) {
                            if (!isset($idx[$key])) return null;
                            $i = $idx[$key];
                            return $data[$i] ?? null;
                        };
                        $record = [
                            'Nama' => $get('Nama'),
                            'NIK' => $get('NIK'),
                            'Telepon' => $get('Telepon'),
                            'Alamat' => $get('Alamat'),
                            'Blok' => $get('Blok'),
                            'NoRumah' => $get('NoRumah'),
                        ];
                        $rowErrors = [];
                        foreach ($requiredHeaders as $h) {
                            if (!isset($record[$h]) || trim((string)$record[$h]) === '') {
                                $rowErrors[] = "Baris {$rowNum}: Kolom {$h} wajib diisi.";
                            }
                        }
                        $nikStr = preg_replace('/\D+/', '', (string) ($record['NIK'] ?? ''));
                        if ($nikStr === '' || strlen($nikStr) !== 16) {
                            $rowErrors[] = "Baris {$rowNum}: NIK harus 16 digit angka.";
                        }
                        if (count($rowErrors)) { $errors = array_merge($errors, $rowErrors); }
                        $rowsOut[] = $record;
                    }
                    fclose($handle);
                } else {
                    $errors[] = 'Tidak bisa membaca file yang diunggah.';
                }
            } catch (\Throwable $e2) {
                $errors[] = 'Gagal membaca file: ' . $e2->getMessage();
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
                'note' => 'Diproses dengan fallback CSV. Pastikan menggunakan template terbaru.'
            ], 200);
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
