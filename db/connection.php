<?php
// ── LOCAL (XAMPP/Laragon) — ACTIVE FOR NOW ─────────────────────────────
$host    = '127.0.0.1';
$db      = 'pos_system';
$user    = 'root';
$pass    = '';

// ── HOSTINGER (production) — swap in when you deploy ───────────────────
// Get these 4 values from Hostinger cPanel → MySQL Databases
// after you create the database and import your SQL file.
// $host    = 'localhost';                  // Hostinger almost always uses 'localhost', not an IP
// $db      = 'PUT_YOUR_DB_NAME_HERE';      // e.g. u123456789_pos_system
// $user    = 'PUT_YOUR_DB_USER_HERE';      // e.g. u123456789_posuser
// $pass    = 'PUT_YOUR_DB_PASSWORD_HERE';  // the password you set when creating the DB user
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=3306;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]));
}
?>