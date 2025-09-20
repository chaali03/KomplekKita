<?php

echo "Testing Supabase PostgreSQL connection...\n";

// Test different connection methods
$connections = [
    'Session Pooler' => [
        'host' => 'aws-0-ap-southeast-1.pooler.supabase.com',
        'port' => '5432',
        'user' => 'postgres.iduumftxjnplvgafihlq'
    ],
    'Transaction Pooler' => [
        'host' => 'aws-0-ap-southeast-1.pooler.supabase.com',
        'port' => '6543',
        'user' => 'postgres.iduumftxjnplvgafihlq'
    ],
    'Direct Connection' => [
        'host' => 'db.iduumftxjnplvgafihlq.supabase.co',
        'port' => '5432',
        'user' => 'postgres'
    ]
];

$dbname = 'postgres';
$password = 'chaali_MwD0324';
$sslModes = ['disable', 'allow', 'prefer', 'require'];

foreach ($connections as $connName => $config) {
    echo "\n=== Testing $connName ===\n";
    
    foreach ($sslModes as $sslMode) {
        echo "\n--- $connName with sslmode=$sslMode ---\n";
        try {
            $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname=$dbname;sslmode=$sslMode";
            echo "DSN: $dsn\n";
            
            $pdo = new PDO($dsn, $config['user'], $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 10,
            ]);
            
            echo "✅ Connection successful with $connName (sslmode=$sslMode)!\n";
            
            // Test query
            $stmt = $pdo->query('SELECT version()');
            $version = $stmt->fetchColumn();
            echo "PostgreSQL version: $version\n";
            
            echo "\n🎉 WORKING CONNECTION FOUND!\n";
            echo "Use these settings in Laravel .env:\n";
            echo "DB_HOST={$config['host']}\n";
            echo "DB_PORT={$config['port']}\n";
            echo "DB_USERNAME={$config['user']}\n";
            echo "DB_SSLMODE=$sslMode\n";
            exit(0); // Stop on first success
            
        } catch (PDOException $e) {
            echo "❌ Failed: " . $e->getMessage() . "\n";
        }
    }
}
