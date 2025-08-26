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

        $requiredHeaders = ['JenisTransaksi', 'Sumber', 'Tanggal', 'Keterangan', 'Jumlah', 'Bulan', 'Tahun', 'SaldoKasSekarang'];
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

            // Map header indices (ignore non-required like '#')
            $idx = [];
            foreach ($headers as $i => $h) {
                if (in_array($h, $requiredHeaders, true)) {
                    $idx[$h] = $i;
                }
            }

            // Iterate data rows starting row 2
            $bulanRef = null; $tahunRef = null; $saldoRef = null;
            for ($row = 2; $row <= $highestRow; $row++) {
                // Skip completely empty rows
                $isEmpty = true;
                for ($col = 1; $col <= $highestColumnIndex; $col++) {
                    $val = $sheet->getCellByColumnAndRow($col, $row)->getCalculatedValue();
                    if ($val !== null && $val !== '') { $isEmpty = false; break; }
                }
                if ($isEmpty) { continue; }

                $record = [
                    'JenisTransaksi' => self::getCell($sheet, $idx, 'JenisTransaksi', $row),
                    'Sumber' => self::getCell($sheet, $idx, 'Sumber', $row),
                    'Tanggal' => self::getCell($sheet, $idx, 'Tanggal', $row),
                    'Keterangan' => self::getCell($sheet, $idx, 'Keterangan', $row),
                    'Jumlah' => self::getCell($sheet, $idx, 'Jumlah', $row),
                    'Bulan' => self::getCell($sheet, $idx, 'Bulan', $row),
                    'Tahun' => self::getCell($sheet, $idx, 'Tahun', $row),
                    'SaldoKasSekarang' => self::getCell($sheet, $idx, 'SaldoKasSekarang', $row),
                ];

                // Per-row validations
                $rowErrors = [];
                foreach ($requiredHeaders as $h) {
                    if (!isset($record[$h]) || trim((string) $record[$h]) === '') {
                        $rowErrors[] = "Baris {$row}: Kolom {$h} wajib diisi.";
                    }
                }

                // JenisTransaksi validation
                $jenis = trim((string) ($record['JenisTransaksi'] ?? ''));
                $allowedJenis = ['Pemasukan', 'Pengeluaran'];
                if ($jenis !== '' && !in_array($jenis, $allowedJenis, true)) {
                    $rowErrors[] = "Baris {$row}: JenisTransaksi harus 'Pemasukan' atau 'Pengeluaran'.";
                }

                // Sumber validation
                $sumber = trim((string) ($record['Sumber'] ?? ''));
                $allowedSumber = ['Kas', 'Iuran'];
                if ($sumber !== '' && !in_array($sumber, $allowedSumber, true)) {
                    $rowErrors[] = "Baris {$row}: Sumber harus 'Kas' atau 'Iuran'.";
                }

                // Tanggal validation (YYYY-MM-DD)
                $date = (string) ($record['Tanggal'] ?? '');
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    $rowErrors[] = "Baris {$row}: Tanggal harus format YYYY-MM-DD.";
                }

                // Jumlah numeric > 0
                $jumlahRaw = (string) ($record['Jumlah'] ?? '');
                $jumlah = is_numeric($jumlahRaw) ? (float) $jumlahRaw : null;
                if ($jumlah === null || $jumlah <= 0) {
                    $rowErrors[] = "Baris {$row}: Jumlah harus angka > 0.";
                } else {
                    $record['Jumlah'] = $jumlah;
                }

                // Bulan 1-12 integer
                $bulanRaw = (string) ($record['Bulan'] ?? '');
                $bulan = ctype_digit($bulanRaw) ? (int) $bulanRaw : null;
                if ($bulan === null || $bulan < 1 || $bulan > 12) {
                    $rowErrors[] = "Baris {$row}: Bulan harus 1-12.";
                } else {
                    $record['Bulan'] = $bulan;
                }

                // Tahun 4-digit
                $tahunRaw = (string) ($record['Tahun'] ?? '');
                $tahun = ctype_digit($tahunRaw) && strlen($tahunRaw) === 4 ? (int) $tahunRaw : null;
                if ($tahun === null) {
                    $rowErrors[] = "Baris {$row}: Tahun harus 4 digit (YYYY).";
                } else {
                    $record['Tahun'] = $tahun;
                }

                // SaldoKasSekarang numeric
                $saldoRaw = (string) ($record['SaldoKasSekarang'] ?? '');
                $saldo = is_numeric($saldoRaw) ? (float) $saldoRaw : null;
                if ($saldo === null) {
                    $rowErrors[] = "Baris {$row}: SaldoKasSekarang harus angka.";
                } else {
                    $record['SaldoKasSekarang'] = $saldo;
                }

                // Consistency checks across rows (bulan/tahun/saldo fixed per batch)
                if ($bulanRef === null) { $bulanRef = $record['Bulan']; }
                if ($tahunRef === null) { $tahunRef = $record['Tahun']; }
                if ($saldoRef === null) { $saldoRef = $record['SaldoKasSekarang']; }
                if ($bulanRef !== null && $record['Bulan'] !== $bulanRef) {
                    $rowErrors[] = "Baris {$row}: Bulan harus sama untuk semua baris (".$bulanRef.").";
                }
                if ($tahunRef !== null && $record['Tahun'] !== $tahunRef) {
                    $rowErrors[] = "Baris {$row}: Tahun harus sama untuk semua baris (".$tahunRef.").";
                }
                if ($saldoRef !== null && $record['SaldoKasSekarang'] !== $saldoRef) {
                    $rowErrors[] = "Baris {$row}: SaldoKasSekarang harus sama untuk semua baris (".$saldoRef.").";
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
