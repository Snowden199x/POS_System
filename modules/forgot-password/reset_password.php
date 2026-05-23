<?php
session_start();

if (isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php?page=home");
    exit();
}

require_once __DIR__ . '/../../db/connection.php';

$token = trim($_GET['token'] ?? '');
$email = trim($_GET['email'] ?? '');
$alert = [];
$valid_token = false;

if (empty($token) || empty($email)) {
    $alert = [
        'type'    => 'error',
        'message' => 'Invalid or missing reset link.'
    ];
} else {
    // Check token in DB
    $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE token = ? AND email = ?");
    $stmt->execute([$token, $email]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        $alert = [
            'type'    => 'error',
            'message' => 'Invalid reset link.'
        ];
    } elseif (strtotime($reset['expires_at']) < time()) {
        $alert = [
            'type'    => 'error',
            'message' => 'Reset link has expired. Please request a new one.'
        ];
    } else {
        $valid_token = true;
    }
}

if (isset($_GET['status'])) {
    switch ($_GET['status']) {
        case 'success':
            $alert = [
                'type'    => 'success',
                'message' => 'Password updated successfully. You can now login.'
            ];
            $valid_token = false;
            break;
        case 'error':
            $alert = [
                'type'    => 'error',
                'message' => 'Something went wrong. Please try again.'
            ];
            break;
        case 'invalid':
            $alert = [
                'type'    => 'error',
                'message' => 'Invalid or expired reset link.'
            ];
            break;
    }
}

include 'reset_password_view.php';
?>