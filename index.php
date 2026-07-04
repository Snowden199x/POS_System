<?php
session_start();

// Handle logout
if (isset($_GET['logout'])) {
    session_unset();
    session_destroy();
    header("Location: index.php");
    exit();
}

require_once __DIR__ . '/db/connection.php';

$error = "";

// If already logged in
if (isset($_SESSION["logged_in"])) {
    $page = $_GET['page'] ?? 'home';

    if ($page === 'home')       include 'modules/homepage/homepage.php';
    elseif ($page === 'orders') include 'modules/orders/orders.php';
    elseif ($page === 'served') include 'modules/served/served.php';
    elseif ($page === 'statistics') include 'modules/statistics/statistics.php';
    elseif ($page === 'profile')    include 'modules/profile/profile.php';
    else include 'modules/homepage/homepage.php';
    exit();
}

// Login
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");
    $password = trim($_POST["password"] ?? "");

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION["logged_in"]   = true;
        $_SESSION["username"]    = $username;
        $_SESSION["user_id"]     = $user['id'];         // ← branch_id = user id
        $_SESSION["branch_name"] = $user['branch_name'] ?? 'Main Branch';
        header("Location: index.php?page=home");
        exit();
    } else {
        $error = "Invalid username or password.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Twist & Roll — Login</title>

 <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1C3924">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="TNR POS">
    <link rel="apple-touch-icon" href="/assets/images/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'DM Sans', sans-serif;
    background: #FEFCE0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-card {
    background: #FEFCE0;
    border: 1px solid #e0ddce;
    border-radius: 40px;
    padding: 40px 36px;
    width: 100%;
    max-width: 360px;
    box-shadow:
        0 10px 25px rgba(0,0,0,0.05),
        0 0 50px rgba(216,195,111,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.login-logo { max-width: 180px; height: auto; }

.login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
}

.forgot-link-wrap { text-align: right; width: 100%; margin-top: -6px; }
.forgot-link { font-size: 12px; color: #7A7A5A; text-decoration: none; }
.forgot-link:hover { color: #C8A84B; text-decoration: underline; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 13px; color: #7A7A5A; }

input[type="text"],
input[type="password"] {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #dbd8c8;
    border-radius: 8px;
    font-size: 14px;
    color: #2C2C1A;
    background: #F3F2D7;
    outline: none;
}

input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #F3F2D7 inset !important;
    -webkit-text-fill-color: #2C2C1A !important;
}

input:focus { border-color: #C8A84B; }

.password-wrapper { position: relative; width: 100%; }
.password-wrapper input { padding-right: 40px; }
.toggle-password {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    color: #7A7A5A;
}

.login-btn {
    width: 100%;
    padding: 12px;
    background: #1C3924;
    color: #fff;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
.login-btn:hover { background: #245a42; }

.error-msg {
    font-size: 13px;
    color: #C0392B;
    background: #fde8e8;
    border-radius: 6px;
    padding: 8px 12px;
    text-align: center;
    width: 100%;
}

.signup-link {
    font-size: 13px;
    color: #7A7A5A;
    text-align: center;
}
.signup-link a {
    color: #C8A84B;
    text-decoration: none;
    font-weight: 600;
}
.signup-link a:hover { text-decoration: underline; }
</style>
</head>

<body>

<div class="login-card">
    <img src="assets/images/logo.png" class="login-logo" alt="Twist & Roll">

    <?php if ($error): ?>
        <p class="error-msg"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>

    <form class="login-form" method="POST">
        <div class="form-group">
            <label>Username</label>
            <input type="text" name="username" required>
        </div>

        <div class="form-group">
            <label>Password</label>
            <div class="password-wrapper">
                <input type="password" id="password" name="password" required>
                <button type="button" class="toggle-password" onclick="togglePassword()">
                    <svg id="eyeOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#7A7A5A" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg id="eyeClosed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#7A7A5A" stroke-width="2" viewBox="0 0 24 24" style="display:none;">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94"/>
                        <path d="M1 1l22 22"/>
                    </svg>
                </button>
            </div>
        </div>

        <div class="forgot-link-wrap">
            <a href="modules/forgot-password/forgot_password.php" class="forgot-link">Forgot Password?</a>
        </div>

        <button type="submit" class="login-btn">Login</button>
    </form>

    <div class="signup-link">
        New branch? <a href="signup.php">Register here</a>
    </div>
</div>

<script>
function togglePassword() {
    const password  = document.getElementById("password");
    const eyeOpen   = document.getElementById("eyeOpen");
    const eyeClosed = document.getElementById("eyeClosed");
    if (password.type === "password") {
        password.type = "text";
        eyeOpen.style.display   = "none";
        eyeClosed.style.display = "inline";
    } else {
        password.type = "password";
        eyeOpen.style.display   = "inline";
        eyeClosed.style.display = "none";
    }
}
</script>

<script src="/assets/js/pwa_register.js"></script>

</body>
</html>