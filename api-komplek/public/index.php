<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Configure output encoding to prevent BOM
ini_set('default_charset', 'UTF-8');
ini_set('output_buffering', 'Off');

// Register output buffer to remove BOM
ob_start(function($buffer) {
    // Remove BOM if present
    if (substr($buffer, 0, 3) === "\xEF\xBB\xBF") {
        return substr($buffer, 3);
    }
    return $buffer;
});

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
