<?php

namespace App\Services\Utils;

class ApiClientService
{
    private $baseUrl;
    
    public function __construct($baseUrl = null)
    {
        $this->baseUrl = $baseUrl ?: env('API_BASE_URL', 'http://127.0.0.1:8000/api');
    }
    
    /**
     * Make an API request
     * 
     * @param string $endpoint
     * @param array $options
     * @param string $method
     * @param array $data
     * @return array
     */
    public function request($endpoint, $method = 'GET', $data = [], $token = null)
    {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];
        
        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        
        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            return [
                'success' => false,
                'error' => $error
            ];
        }
        
        $data = json_decode($response, true);
        
        if ($httpCode >= 400) {
            return [
                'success' => false,
                'error' => $data['message'] ?? $data['error'] ?? 'Request failed'
            ];
        }
        
        return [
            'success' => true,
            'data' => $data
        ];
    }
    
    /**
     * Make a GET request
     */
    public function get($endpoint, $token = null)
    {
        return $this->request($endpoint, 'GET', [], $token);
    }
    
    /**
     * Make a POST request
     */
    public function post($endpoint, $data = [], $token = null)
    {
        return $this->request($endpoint, 'POST', $data, $token);
    }
    
    /**
     * Make a PUT request
     */
    public function put($endpoint, $data = [], $token = null)
    {
        return $this->request($endpoint, 'PUT', $data, $token);
    }
    
    /**
     * Make a DELETE request
     */
    public function delete($endpoint, $token = null)
    {
        return $this->request($endpoint, 'DELETE', [], $token);
    }
}