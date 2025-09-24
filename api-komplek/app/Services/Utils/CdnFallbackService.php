<?php

namespace App\Services\Utils;

class CdnFallbackService
{
    private array $cdnResources = [
        'chartjs' => [
            'primary' => 'https://cdn.jsdelivr.net/npm/chart.js',
            'fallback' => 'https://unpkg.com/chart.js',
        ],
        'fontawesome' => [
            'primary' => 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            'fallback' => 'https://use.fontawesome.com/releases/v6.4.0/css/all.css',
        ],
        'aos' => [
            'primary' => 'https://unpkg.com/aos@2.3.1/dist/aos.css',
            'fallback' => 'https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.css',
        ],
        'aosjs' => [
            'primary' => 'https://unpkg.com/aos@2.3.1/dist/aos.js',
            'fallback' => 'https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.js',
        ],
        'lottie' => [
            'primary' => 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js',
            'fallback' => 'https://cdn.jsdelivr.net/npm/@lottiefiles/lottie-player/dist/lottie-player.js',
        ],
        'xlsx' => [
            'primary' => 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            'fallback' => 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
        ],
        'jspdf' => [
            'primary' => 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
            'fallback' => 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
        ],
        'jspdfautotable' => [
            'primary' => 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
            'fallback' => 'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
        ],
    ];

    /**
     * Get CDN resources
     * 
     * @return array
     */
    public function getCdnResources(): array
    {
        return $this->cdnResources;
    }

    /**
     * Get a specific CDN resource
     * 
     * @param string $name
     * @return array|null
     */
    public function getCdnResource(string $name): ?array
    {
        return $this->cdnResources[$name] ?? null;
    }

    /**
     * Get all CDN URLs (primary and fallback)
     * 
     * @return array
     */
    public function getAllCdnUrls(): array
    {
        $urls = [];
        foreach ($this->cdnResources as $resource) {
            $urls[] = $resource['primary'];
            if (isset($resource['fallback'])) {
                $urls[] = $resource['fallback'];
            }
        }
        return $urls;
    }
}