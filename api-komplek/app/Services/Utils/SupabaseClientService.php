<?php

namespace App\Services\Utils;

class SupabaseClientService
{
    private string $supabaseUrl;
    private string $supabaseKey;
    private FetchWrapperService $fetchWrapper;

    public function __construct(FetchWrapperService $fetchWrapper)
    {
        $this->supabaseUrl = env('SUPABASE_URL', '');
        // Prefer service role key on the server. Fallback to anon key if service key is not set.
        $this->supabaseKey = env('SUPABASE_SERVICE_KEY', env('SUPABASE_ANON_KEY', ''));
        $this->fetchWrapper = $fetchWrapper;
    }

    /**
     * Get data from Supabase
     * 
     * @param string $table
     * @param array $options
     * @return array
     */
    public function getData(string $table, array $options = []): array
    {
        $url = $this->supabaseUrl . '/rest/v1/' . $table;
        $headers = [
            'apikey' => $this->supabaseKey,
            'Authorization' => 'Bearer ' . $this->supabaseKey
        ];

        // Add query parameters
        if (!empty($options)) {
            $queryParams = [];
            foreach ($options as $key => $value) {
                $queryParams[] = $key . '=' . urlencode($value);
            }
            $url .= '?' . implode('&', $queryParams);
        }

        return $this->fetchWrapper->get($url, $headers);
    }

    /**
     * Insert data to Supabase
     * 
     * @param string $table
     * @param array $data
     * @return array
     */
    public function insertData(string $table, array $data): array
    {
        $url = $this->supabaseUrl . '/rest/v1/' . $table;
        $headers = [
            'apikey' => $this->supabaseKey,
            'Authorization' => 'Bearer ' . $this->supabaseKey,
            'Prefer' => 'return=representation'
        ];

        return $this->fetchWrapper->post($url, $data, $headers);
    }

    /**
     * Update data in Supabase
     * 
     * @param string $table
     * @param array $data
     * @param string $column
     * @param mixed $value
     * @return array
     */
    public function updateData(string $table, array $data, string $column, $value): array
    {
        $url = $this->supabaseUrl . '/rest/v1/' . $table . '?' . $column . '=eq.' . urlencode($value);
        $headers = [
            'apikey' => $this->supabaseKey,
            'Authorization' => 'Bearer ' . $this->supabaseKey,
            'Prefer' => 'return=representation'
        ];

        return $this->fetchWrapper->put($url, $data, $headers);
    }

    /**
     * Delete data from Supabase
     * 
     * @param string $table
     * @param string $column
     * @param mixed $value
     * @return array
     */
    public function deleteData(string $table, string $column, $value): array
    {
        $url = $this->supabaseUrl . '/rest/v1/' . $table . '?' . $column . '=eq.' . urlencode($value);
        $headers = [
            'apikey' => $this->supabaseKey,
            'Authorization' => 'Bearer ' . $this->supabaseKey
        ];

        return $this->fetchWrapper->delete($url, $headers);
    }
}