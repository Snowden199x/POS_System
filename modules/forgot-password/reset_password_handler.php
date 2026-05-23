<?php
session_start();

require_once __DIR__ . '/../../db/connection.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: ../../index.php");
    exit();
}

$token          = trim($_POST['token']           ?? '');
$email          = trim($_POST['email']           ?? '');
$new_password   = trim($_POST['new_password']    ?? '');
$confirm_password = trim($_POST['confirm_password'] ?? '');

if (empty($token) || empty($email) || empty($new_password) || empty($confirm_password)) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}

// Validate token
$stmt = $pdo->prepare("SELECT * FROM password_resets WHERE token = ? AND email = ?");
$stmt->execute([$token, $email]);
$reset = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$reset) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=invalid");
    exit();
}

if (strtotime($reset['expires_at']) < time()) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=invalid");
    exit();
}

// Validate password strength
if (strlen($new_password) < 8) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}
if (!preg_match('/[A-Z]/', $new_password)) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}
if (!preg_match('/[0-9]/', $new_password)) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}
if (!preg_match('/[\W_]/', $new_password)) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}
if ($new_password !== $confirm_password) {
    header("Location: reset_password.php?token=$token&email=" . urlencode($email) . "&status=error");
    exit();
}

// Update password
$hashed = password_hash($new_password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
$stmt->execute([$hashed, $email]);

// Delete used token
$pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

header("Location: reset_password.php?status=success");
exit();
?>