<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class SupabaseService
{
    protected $client;
    protected $apiKey;
    protected $serviceKey;

    public function __construct()
    {
        // Dapatkan konfigurasi dari .env
        $supabaseUrl = config('services.supabase.url');
        $this->apiKey = config('services.supabase.key');
        $this->serviceKey = config('services.supabase.service_key');
        
        // Validasi konfigurasi
        if (empty($supabaseUrl) || empty($this->apiKey) || empty($this->serviceKey)) {
            throw new \RuntimeException('Supabase configuration is missing. Please check your .env file.');
        }
        
        // Pastikan URL berakhir dengan slash
        $baseUrl = rtrim($supabaseUrl, '/') . '/rest/v1';
        
        // Log konfigurasi (jangan log kunci rahasia)
        Log::debug('Initializing Supabase client', [
            'base_url' => $baseUrl,
            'has_api_key' => !empty($this->apiKey),
            'has_service_key' => !empty($this->serviceKey),
        ]);
        
        try {
            $this->client = new Client([
                'base_uri' => $baseUrl . '/',
                'headers' => [
                    'apikey' => $this->apiKey,
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'Prefer' => 'return=representation',
                ],
                'verify' => false, // Hanya untuk pengembangan
                'timeout' => 15,
                'connect_timeout' => 5,
                'http_errors' => false,
                'allow_redirects' => [
                    'max' => 5,
                    'strict' => true,
                    'referer' => true,
                    'protocols' => ['http', 'https'],
                ],
                'decode_content' => true,
            ]);
            
            Log::info('Supabase client initialized successfully');
            
        } catch (\Exception $e) {
            Log::error('Failed to initialize Supabase client', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new \RuntimeException('Failed to initialize Supabase client: ' . $e->getMessage());
        }
    }

    /**
     * Make a request to Supabase REST API
     */
    private function request($method, $path, $data = null, $useServiceKey = false)
    {
        $method = strtoupper($method);
        $options = [];
        $path = ltrim($path, '/');
        
        // Log request details
        Log::info('Supabase Request:', [
            'method' => $method,
            'path' => $path,
            'data' => $data,
            'useServiceKey' => $useServiceKey
        ]);
        
        // Set request body for POST, PUT, PATCH
        if (in_array($method, ['POST', 'PUT', 'PATCH']) && $data) {
            $options['json'] = $data;
        }
        
        // Set query parameters for GET
        if ($method === 'GET' && is_array($data)) {
            $options['query'] = $data;
        }
        
        // Use service key if requested
        if ($useServiceKey) {
            $options['headers'] = [
                'apikey' => $this->serviceKey,
                'Authorization' => 'Bearer ' . $this->serviceKey,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation',
            ];
        }
        
        try {
            $response = $this->client->request($method, $path, $options);
            
            $statusCode = $response->getStatusCode();
            $body = json_decode($response->getBody()->getContents(), true) ?? [];
            
            // Log successful response
            Log::info('Supabase Response:', [
                'status' => $statusCode,
                'body' => $body
            ]);
            
            // Handle non-2xx responses
            if ($statusCode < 200 || $statusCode >= 300) {
                $errorMsg = "HTTP $statusCode";
                if (isset($body['message'])) {
                    $errorMsg .= ": " . $body['message'];
                } elseif (!empty($body)) {
                    $errorMsg .= ": " . json_encode($body);
                }
                throw new \Exception($errorMsg);
            }
            
            return $body;
            
        } catch (\Exception $e) {
            Log::error('Supabase Request Failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new \Exception('Supabase request failed: ' . $e->getMessage());
        }
    }

    /**
     * Build query parameters for Supabase
     */
    private function buildQueryParams($params = [])
    {
        $query = [];
        
        foreach ($params as $key => $value) {
            if (is_array($value)) {
                $query[$key] = '[' . implode(',', $value) . ']';
            } else {
                $query[$key] = $value;
            }
        }
        
        return $query;
    }

    /**
     * Query data from Supabase
     */
    public function query($table, $conditions = [], $useServiceKey = false)
    {
        $query = $this->buildQueryParams($conditions);
        return $this->request('GET', $table, $query, $useServiceKey);
    }
    
    /**
     * Insert data into Supabase
     */
    public function insert($table, $data, $useServiceKey = true)
    {
        return $this->request('POST', $table, $data, $useServiceKey);
    }
    
    /**
     * Update data in Supabase
     */
    public function update($table, $conditions, $data, $useServiceKey = true)
    {
        // Build query parameters for conditions
        $query = [];
        foreach ($conditions as $key => $value) {
            // Default to equality if no operator is specified
            if (strpos($key, '.') === false) {
                $query["$key"] = 'eq.' . $value;
            } else {
                $query[$key] = $value;
            }
        }
        
        // Add the data to update
        $options = [
            'query' => $query,
            'json' => $data
        ];
        
        // Make the PATCH request
        return $this->request('PATCH', $table, $options, $useServiceKey);
    }
    
    /**
     * Check if a record exists in the table
     */
    public function exists($table, $conditions)
    {
        $query = [];
        foreach ($conditions as $key => $value) {
            // Default to equality if no operator is specified
            if (strpos($key, '.') === false) {
                $query["$key"] = 'eq.' . $value;
            } else {
                $query[$key] = $value;
            }
        }
        
        $query['select'] = 'id';
        $query['limit'] = 1;
        
        $result = $this->query($table, $query, true);
        return !empty($result);
    }

    /**
     * Count records matching conditions
     */
    public function count($table, $conditions = [])
    {
        $query = [];
        foreach ($conditions as $key => $value) {
            // Default to equality if no operator is specified
            if (strpos($key, '.') === false) {
                $query[$key] = 'eq.' . $value;
            } else {
                $query[$key] = $value;
            }
        }
        
        // Add count header
        $query['select'] = 'count';
        
        $result = $this->query($table, $query, true);
        
        // The response should be an array with a single object containing the count
        if (is_array($result) && count($result) > 0) {
            return (int) $result[0]['count'];
        }
        
        return 0;
    }

    /**
     * Test Supabase connection
     */
    public function testConnection()
    {
        try {
            // Test connection to Supabase REST API
            $response = $this->request('GET', '');
            
            // If we get here, the connection was successful
            return [
                'success' => true,
                'status' => 200,
                'message' => 'Connected to Supabase REST API',
                'version' => $response['_postgrest']['version'] ?? 'unknown'
            ];
            
        } catch (\Exception $e) {
            // Log the full error for debugging
            Log::error('Supabase connection test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return a simplified error response
            return [
                'success' => false,
                'status' => 0,
                'error' => 'Failed to connect to Supabase: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check if komplek name exists (legacy compatibility)
     */
    public function checkKomplekName($name)
    {
        try {
            return $this->exists('komplek', ['nama' => 'eq.' . $name]);
        } catch (\Exception $e) {
            // Fallback to demo data if API fails
            $takenNames = [
                'griya harmoni',
                'taman sari', 
                'villa melati',
                'komplek mawar',
                'perumahan indah'
            ];
            
            return in_array(strtolower($name), $takenNames);
        }
    }

    /**
     * Get komplek by ID (legacy compatibility)
     */
    public function getKomplek($id)
    {
        return $this->find('komplek', $id);
    }

    /**
     * Create new komplek (legacy compatibility)
     */
    public function createKomplek($data)
    {
        return $this->insert('komplek', $data);
    }
}
