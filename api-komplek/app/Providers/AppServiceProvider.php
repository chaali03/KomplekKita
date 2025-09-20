<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set password reset URL
        URL::forceRootUrl(config('app.url'));
        
        // Register a global output buffer handler to remove BOM from all output
        ob_start(function ($buffer) {
            // Remove BOM if present at the beginning of the buffer
            if (substr($buffer, 0, 3) === "\xEF\xBB\xBF") {
                return substr($buffer, 3);
            }
            return $buffer;
        });
        
        // Override the default json response macro to ensure no BOM
        Response::macro('json', function ($data, $status = 200, array $headers = [], $options = 0) {
            $json = json_encode($data, $options);
            
            // Remove BOM if present
            if (strncmp($json, "\xEF\xBB\xBF", 3) === 0) {
                $json = substr($json, 3);
            }
            
            $response = new \Illuminate\Http\Response($json, $status);
            $response->header('Content-Type', 'application/json');
            
            foreach ($headers as $key => $value) {
                $response->header($key, $value);
            }
            
            return $response;
        });
    }
}
