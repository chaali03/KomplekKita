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
                'errorType' => 'file',
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
            'application/vnd.ms-office',
            'application/zip',
            'application/octet-stream',
            'text/csv',
            'text/plain',
        ];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV',
                'errors' => ['Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV'],
                'errorType' => 'filetype',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
        }

        // Validate file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ukuran file maksimum 5MB',
                'errors' => ['Ukuran file melebihi batas maksimum 5MB'],
                'errorType' => 'file',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
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
                    'errorType' => 'content',
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
                $errorMsg = 'Kolom wajib tidak ditemukan: ' . implode(', ', $missingColumns);
                return response()->json([
                    'status' => 'error',
                    'message' => $errorMsg,
                    'errors' => [$errorMsg],
                    'errorType' => 'content',
                    'expectedHeaders' => $requiredColumns,
                    'data' => [],
                    'summary' => [
                        'total' => 0,
                        'validCount' => 0,
                        'errorCount' => 1
                    ]
                ], 200);
            }

            // Process data rows
            $data = [];
            $errors = [];
            $success = 0;
            $failed = 0;
            $rowNumber = 1; // Start from 1 because we're skipping header

            // Skip header row
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip empty rows
                if (empty(array_filter($row, function($value) { 
                    return $value !== null && $value !== ''; 
                }))) {
                    $rowNumber++;
                    continue;
                }
                
                // Map row data to columns
                $rowData = [];
                $rowErrors = [];
                
                foreach ($headers as $index => $header) {
                    $value = $row[$index] ?? null;
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
                
                $rowNumber++;
            }
            
            // Return response with consistent format
            $status = $failed === 0 ? 'ok' : ($success > 0 ? 'ok' : 'error');
            $message = $failed === 0 ? 'Semua data valid' : 
                      ($success > 0 ? 'Beberapa data memiliki masalah' : 'Terdapat masalah pada data');
            
            return response()->json([
                'status' => $status,
                'message' => $message,
                'data' => $data,
                'errors' => $errors,
                'errorType' => $failed > 0 ? 'content' : null,
                'expectedHeaders' => $requiredColumns,
                'summary' => [
                    'total' => $success + $failed,
                    'validCount' => $success,
                    'errorCount' => $failed
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat memproses file: ' . $e->getMessage(),
                'errors' => ['Terjadi kesalahan saat memproses file: ' . $e->getMessage()],
                'errorType' => 'content',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
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
                'errorType' => 'file',
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
            'application/vnd.ms-office',
            'application/zip',
            'application/octet-stream',
            'text/csv',
            'text/plain',
        ];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV',
                'errors' => ['Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV'],
                'errorType' => 'filetype',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
        }

        // Validate file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ukuran file maksimum 5MB',
                'errors' => ['Ukuran file melebihi batas maksimum 5MB'],
                'errorType' => 'file',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
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
                    'message' => 'File tidak berisi data keuangan',
                    'errors' => ['File tidak berisi data keuangan. Pastikan ada data di bawah header'],
                    'errorType' => 'content',
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
            $requiredColumns = ['Keterangan', 'Jumlah', 'Kategori', 'Tanggal'];
            
            // Check if all required columns exist
            $missingColumns = [];
            foreach ($requiredColumns as $column) {
                if (!in_array($column, $headers)) {
                    $missingColumns[] = $column;
                }
            }
            
            if (!empty($missingColumns)) {
                $errorMsg = 'Kolom wajib tidak ditemukan: ' . implode(', ', $missingColumns);
                return response()->json([
                    'status' => 'error',
                    'message' => $errorMsg,
                    'errors' => [$errorMsg],
                    'errorType' => 'content',
                    'expectedHeaders' => $requiredColumns,
                    'data' => [],
                    'summary' => [
                        'total' => 0,
                        'validCount' => 0,
                        'errorCount' => 1
                    ]
                ], 200);
            }

            // Process data rows
            $data = [];
            $errors = [];
            $success = 0;
            $failed = 0;
            $rowNumber = 1; // Start from 1 because we're skipping header

            // Skip header row
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip empty rows
                if (empty(array_filter($row, function($value) { 
                    return $value !== null && $value !== ''; 
                }))) {
                    $rowNumber++;
                    continue;
                }
                
                // Map row data to columns
                $rowData = [];
                $rowErrors = [];
                
                foreach ($headers as $index => $header) {
                    $value = $row[$index] ?? null;
                    $rowData[$header] = $value;
                }
                
                // Validate required fields
                foreach ($requiredColumns as $column) {
                    if (empty($rowData[$column])) {
                        $rowErrors[] = "Kolom {$column} kosong pada baris " . ($i + 1);
                    }
                }
                
                // Validate Jumlah (must be numeric)
                if (!empty($rowData['Jumlah']) && !is_numeric($rowData['Jumlah'])) {
                    $rowErrors[] = "Jumlah harus berupa angka pada baris " . ($i + 1);
                }
                
                // Validate Tanggal (must be valid date)
                if (!empty($rowData['Tanggal'])) {
                    try {
                        new \DateTime($rowData['Tanggal']);
                    } catch (\Exception $e) {
                        $rowErrors[] = "Format tanggal tidak valid pada baris " . ($i + 1) . ". Gunakan format YYYY-MM-DD";
                    }
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
                
                $rowNumber++;
            }
            
            // Return response with consistent format
            $status = $failed === 0 ? 'ok' : ($success > 0 ? 'ok' : 'error');
            $message = $failed === 0 ? 'Semua data valid' : 
                      ($success > 0 ? 'Beberapa data memiliki masalah' : 'Terdapat masalah pada data');
            
            return response()->json([
                'status' => $status,
                'message' => $message,
                'data' => $data,
                'errors' => $errors,
                'errorType' => $failed > 0 ? 'content' : null,
                'expectedHeaders' => $requiredColumns,
                'summary' => [
                    'total' => $success + $failed,
                    'validCount' => $success,
                    'errorCount' => $failed
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat memproses file: ' . $e->getMessage(),
                'errors' => ['Terjadi kesalahan saat memproses file: ' . $e->getMessage()],
                'errorType' => 'content',
                'data' => [],
                'summary' => [
                    'total' => 0,
                    'validCount' => 0,
                    'errorCount' => 1
                ]
            ], 200);
        }
    }
}
