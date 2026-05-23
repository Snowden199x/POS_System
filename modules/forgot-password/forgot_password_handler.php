<?php
session_start();

require_once __DIR__ . '/../../db/connection.php';
require_once __DIR__ . '/../../db/mail_config.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: forgot_password.php");
    exit();
}

$email = trim($_POST['email'] ?? '');

if (empty($email)) {
    header("Location: forgot_password.php?status=error");
    exit();
}

// Check if email exists in DB
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    header("Location: forgot_password.php?status=notfound");
    exit();
}

// Generate token
$token     = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Delete old tokens for this email
$pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

// Save new token
$stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
$stmt->execute([$email, $token, $expiresAt]);

// Build reset link
$resetLink = APP_BASE_URL . "/modules/forgot-password/reset_password.php?token=" . $token . "&email=" . urlencode($email);

// Send email
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USERNAME;
    $mail->Password   = MAIL_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = MAIL_PORT;

    $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
    $mail->addAddress($email, $user['full_name']);

    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->Subject = 'Reset Your Password - Twist & Roll';
  
    $mail->Body = getEmailTemplate($user['full_name'], $resetLink, $email);

    $mail->send();

    header("Location: forgot_password.php?status=sent");
    exit();

} catch (Exception $e) {
    header("Location: forgot_password.php?status=error");
    exit();
}

// Email template function
function getEmailTemplate(string $fullName, string $resetLink, string $email): string {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: #FEFCE0; padding: 0; text-align: center; border-bottom: 1px solid #e8e4cc; overflow: hidden; }
            .header img { width: 100% !important; max-width: 100% !important; display: block; }
            .body { padding: 36px 40px; color: #2C2C1A; }
            .body p { font-size: 15px; line-height: 1.7; margin-bottom: 16px; color: #3a3a2a; }
            .btn-wrap { text-align: center; margin: 28px 0; }
            .btn { display: inline-block; padding: 14px 36px; background: #1C3924; color: #ffffff !important; text-decoration: none; border-radius: 24px; font-size: 15px; font-weight: 600; }
            .link-fallback { font-size: 13px; color: #7A7A5A; word-break: break-all; }
            .link-fallback a { color: #C8A84B; }
            .footer { background: #1C3924; padding: 20px; text-align: center; }
            .footer p { color: #a8c5b0; font-size: 12px; margin: 4px 0; }
            .divider { border: none; border-top: 1px solid #e8e4cc; margin: 24px 0; }
            .note { background: #f5f5f0; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #7A7A5A; margin-top: 8px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <img src="https://i.ibb.co/mrcYP2y8/POS-banner.png" alt="Twist & Roll" style="width:100%; height:auto; display:block;">
            </div>
            <div class="body">
                <p>Hi <strong>' . htmlspecialchars($fullName) . '</strong>,</p>
                <p>You requested to reset your password for your <strong>Twist & Roll</strong> account.</p>
                <p>Click the button below to reset your password:</p>

                <div class="btn-wrap">
                    <a href="' . $resetLink . '" class="btn">Reset your password</a>
                </div>

                <p class="link-fallback">If the button does not work, copy and paste this link into your browser:<br>
                    <a href="' . $resetLink . '">' . $resetLink . '</a>
                </p>

                <p>If you did not request this, you can ignore this email.</p>

                <hr class="divider">

                <div class="note">
                    <p>This is a system generated message. Do not reply.</p>
                    <p>This message is intended to <strong>' . htmlspecialchars($email) . '</strong> upon request.</p>
                </div>
            </div>
            <div class="footer">
                <p>© 2026 Twist & Roll. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ';
}
?>