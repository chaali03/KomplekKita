<?php

require 'vendor/autoload.php';

$host = 'aws-1-ap-southeast-1.pooler.supabase.com';
$dbname = 'postgres';
$user = 'postgres.iduumftxjnplvgafihlq';
$password = 'chaali_MwD0324';
$port = 6543;

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$password;sslmode=require";

try {
    $pdo = new PDO($dsn);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Koneksi berhasil!<br>";
    
    // Coba query sederhana
    $stmt = $pdo->query('SELECT version()');
    $version = $stmt->fetch();
    
    echo "Versi PostgreSQL: " . $version[0] . "<br>";
    
    // Cek tabel iuran
    $tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    echo "Tabel yang tersedia:<br>";
    foreach ($tables as $table) {
        echo "- " . $table['table_name'] . "<br>";
    }
    
} catch (PDOException $e) {
    echo "Koneksi gagal: " . $e->getMessage() . "<br>";
    
    // Cek error lebih detail
    echo "Error Code: " . $e->getCode() . "<br>";
    echo "File: " . $e->getFile() . "<br>";
    echo "Line: " . $e->getLine() . "<br>";
    
    // Cek koneksi ke host
    $connected = @fsockopen($host, $port, $errno, $errstr, 5);
    if ($connected) {
        echo "Koneksi ke $host:$port berhasil (TCP)<br>";
        fclose($connected);
    } else {
        echo "Tidak dapat terhubung ke $host:$port (TCP) - $errstr ($errno)<br>";
    }
}
