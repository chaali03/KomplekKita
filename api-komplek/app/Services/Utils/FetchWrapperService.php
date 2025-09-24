<?php

namespace App\Services\Utils;

class FetchWrapperService
{
    /**
     * Fetch data from external API
     * 
     * @param string $url
     * @param array $options
     * @return array
     */
    public function fetch(string $url, array $options = []): array
    {
        $method = $options['method'] ?? 'GET';
        $headers = $options['headers'] ?? [];
        $body = $options['body'] ?? null;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if (!empty($headers)) {
            $headerArray = [];
            foreach ($headers as $key => $value) {
                $headerArray[] = "$key: $value";
            }
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headerArray);
        }
        
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($body) ? json_encode($body) : $body);
        }
        
        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return [
                'success' => false,
                'error' => $error,
                'status' => $statusCode
            ];
        }
        
        return [
            'success' => $statusCode >= 200 && $statusCode < 300,
            'data' => json_decode($response, true),
            'status' => $statusCode
        ];
    }
    
    /**
     * GET request
     * 
     * @param string $url
     * @param array $headers
     * @return array
     */
    public function get(string $url, array $headers = []): array
    {
        return $this->fetch($url, [
            'method' => 'GET',
            'headers' => $headers
        ]);
    }
    
    /**
     * POST request
     * 
     * @param string $url
     * @param array|string $body
     * @param array $headers
     * @return array
     */
    public function post(string $url, $body, array $headers = []): array
    {
        return $this->fetch($url, [
            'method' => 'POST',
            'headers' => array_merge(['Content-Type' => 'application/json'], $headers),
            'body' => $body
        ]);
    }
    
    /**
     * PUT request
     * 
     * @param string $url
     * @param array|string $body
     * @param array $headers
     * @return array
     */
    public function put(string $url, $body, array $headers = []): array
    {
        return $this->fetch($url, [
            'method' => 'PUT',
            'headers' => array_merge(['Content-Type' => 'application/json'], $headers),
            'body' => $body
        ]);
    }
    
    /**
     * DELETE request
     * 
     * @param string $url
     * @param array $headers
     * @return array
     */
    public function delete(string $url, array $headers = []): array
    {
        return $this->fetch($url, [
            'method' => 'DELETE',
            'headers' => $headers
        ]);
    }
}