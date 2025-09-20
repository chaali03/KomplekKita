<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportController extends Controller
{
    /**
     * Preview warga data from Excel file
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function previewWarga(Request $request)
    {
        // Check for file in multiple possible field names
        $file = null;
        $fieldNames = ['file', 'excel', 'upload', 'attachment'];
        
        foreach ($fieldNames as $field) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                break;
            }
        }

        if (!$file) {
            return response()->json([
                'status' => 'error',
                'message' => 'File tidak ditemukan. Pastikan untuk mengirim file dengan field: file, excel, upload, atau attachment',
                'errors' => ['Tidak ada file yang diunggah'],
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
        }

        // Validate file type
        $allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'text/plain',
        ];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV'
            ], 400);
        }

        // Validate file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ukuran file maksimum 5MB'
            ], 400);
        }

        try {
            // Load spreadsheet
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Ensure we have data
            if (count($rows) <= 1) { // Only header or empty
                return response()->json([
                    'status' => 'error',
                    'message' => 'File tidak berisi data warga',
                    'errors' => ['File tidak berisi data warga. Pastikan ada data di bawah header'],
                    'data' => [],
                    'summary' => [
                        'total' => 0,
                        'validCount' => 0,
                        'errorCount' => 1
                    ]
                ], 200);
            }

            // Get headers (first row)
            $headers = $rows[0];
            
            // Required columns
            $requiredColumns = ['Nama', 'NIK', 'Telepon', 'Alamat', 'Blok', 'NoRumah'];
            
            // Check if all required columns exist
            $missingColumns = [];
            foreach ($requiredColumns as $column) {
                if (!in_array($column, $headers)) {
                    $missingColumns[] = $column;
                }
            }
            
            if (!empty($missingColumns)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Kolom wajib tidak ditemukan: ' . implode(', ', $missingColumns)
                ], 400);
            }

            // Process data rows
            $data = [];
            $errors = [];
            $success = 0;
            $failed = 0;

            // Skip header row
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }
                
                // Map row data to columns
                $rowData = [];
                $rowErrors = [];
                
                foreach ($headers as $index => $header) {
                    $value = isset($row[$index]) ? $row[$index] : null;
                    $rowData[$header] = $value;
                }
                
                // Validate required fields
                foreach ($requiredColumns as $column) {
                    if (empty($rowData[$column])) {
                        $rowErrors[] = "Kolom {$column} kosong pada baris " . ($i + 1);
                    }
                }
                
                // Validate NIK (must be numeric and 16 digits)
                if (!empty($rowData['NIK']) && (!is_numeric($rowData['NIK']) || strlen((string)$rowData['NIK']) != 16)) {
                    $rowErrors[] = "NIK harus 16 digit angka pada baris " . ($i + 1);
                }
                
                // Validate phone number (must be numeric)
                if (!empty($rowData['Telepon']) && !is_numeric($rowData['Telepon'])) {
                    $rowErrors[] = "Nomor telepon harus berupa angka pada baris " . ($i + 1);
                }
                
                // Add to data array
                $data[] = $rowData;
                
                // Track errors
                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    $failed++;
                } else {
                    $success++;
                }
            }
            
            // Return response
            return response()->json([
                'status' => empty($errors) ? 'ok' : 'error',
                'data' => $data,
                'errors' => $errors,
                'summary' => [
                    'total' => count($data),
                    'success' => $success,
                    'failed' => $failed
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memproses file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview keuangan data from Excel file
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function previewKeuangan(Request $request)
    {
        // Validate request has file
        if (!$request->hasFile('file')) {
            return response()->json([
                'status' => 'error',
                'message' => 'File tidak ditemukan'
            ], 400);
        }

        $file = $request->file('file');

        // Validate file type
        $allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'text/plain',
        ];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV'
            ], 400);
        }

        // Validate file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ukuran file maksimum 5MB'
            ], 400);
        }

        try {
            // Load spreadsheet
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Ensure we have data
            if (count($rows) <= 1) { // Only header or empty
                return response()->json([
                    'status' => 'error',
                    'message' => 'File tidak berisi data keuangan'
                ], 400);
            }

            // Get headers (first row)
            $headers = $rows[0];
            
            // Required columns
            $requiredColumns = ['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Jumlah'];
            
            // Check if all required columns exist
            $missingColumns = [];
            foreach ($requiredColumns as $column) {
                if (!in_array($column, $headers)) {
                    $missingColumns[] = $column;
                }
            }
            
            if (!empty($missingColumns)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Kolom wajib tidak ditemukan: ' . implode(', ', $missingColumns)
                ], 400);
            }

            // Process data rows
            $data = [];
            $errors = [];
            $success = 0;
            $failed = 0;

            // Skip header row
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }
                
                // Map row data to columns
                $rowData = [];
                $rowErrors = [];
                
                foreach ($headers as $index => $header) {
                    $value = isset($row[$index]) ? $row[$index] : null;
                    $rowData[$header] = $value;
                }
                
                // Validate required fields
                foreach ($requiredColumns as $column) {
                    if (empty($rowData[$column])) {
                        $rowErrors[] = "Kolom {$column} kosong pada baris " . ($i + 1);
                    }
                }
                
                // Validate date format (YYYY-MM-DD)
                if (!empty($rowData['Tanggal']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $rowData['Tanggal'])) {
                    $rowErrors[] = "Format tanggal harus YYYY-MM-DD pada baris " . ($i + 1);
                }
                
                // Validate Tipe (must be Masuk or Keluar)
                if (!empty($rowData['Tipe']) && !in_array($rowData['Tipe'], ['Masuk', 'Keluar'])) {
                    $rowErrors[] = "Tipe harus 'Masuk' atau 'Keluar' pada baris " . ($i + 1);
                }
                
                // Validate Jumlah (must be numeric and > 0)
                if (!empty($rowData['Jumlah']) && (!is_numeric($rowData['Jumlah']) || $rowData['Jumlah'] <= 0)) {
                    $rowErrors[] = "Jumlah harus berupa angka positif pada baris " . ($i + 1);
                }
                
                // Add to data array
                $data[] = $rowData;
                
                // Track errors
                if (!empty($rowErrors)) {
                    $errors = array_merge($errors, $rowErrors);
                    $failed++;
                } else {
                    $success++;
                }
            }
            
            // Return response
            return response()->json([
                'status' => empty($errors) ? 'ok' : 'error',
                'data' => $data,
                'errors' => $errors,
                'summary' => [
                    'total' => count($data),
                    'success' => $success,
                    'failed' => $failed
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memproses file: ' . $e->getMessage()
            ], 500);
        }
    }
}