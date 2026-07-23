<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Twist & Roll — Register Branch</title>
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
    padding: 20px;
}

.card {
    background: #FEFCE0;
    border: 1px solid #e0ddce;
    border-radius: 40px;
    padding: 40px 36px;
    width: 100%;
    max-width: 400px;
    box-shadow:
        0 10px 25px rgba(0,0,0,0.05),
        0 0 50px rgba(216,195,111,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.logo { max-width: 160px; height: auto; }

.card-title {
    font-size: 20px;
    font-weight: 700;
    color: #1C3924;
    text-align: center;
    margin-bottom: -6px;
}

.card-sub {
    font-size: 13px;
    color: #7A7A5A;
    text-align: center;
    margin-top: -10px;
}

.form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 13px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

label {
    font-size: 13px;
    color: #7A7A5A;
    font-weight: 500;
}

input[type="text"],
input[type="email"],
input[type="password"] {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #dbd8c8;
    border-radius: 8px;
    font-size: 14px;
    color: #2C2C1A;
    background: #F3F2D7;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s;
}

input:focus { border-color: #C8A84B; }

input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #F3F2D7 inset !important;
    -webkit-text-fill-color: #2C2C1A !important;
}

.pw-wrap { position: relative; }
.pw-wrap input { padding-right: 40px; }
.pw-toggle {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    background: none;
    border: none;
    display: flex;
    align-items: center;
    color: #7A7A5A;
}

.btn-submit {
    width: 100%;
    padding: 12px;
    background: #1C3924;
    color: #fff;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
    margin-top: 4px;
}
.btn-submit:hover { background: #245a42; }

.login-link {
    font-size: 13px;
    color: #7A7A5A;
    text-align: center;
}
.login-link a {
    color: #C8A84B;
    text-decoration: none;
    font-weight: 600;
}
.login-link a:hover { text-decoration: underline; }

.alert {
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
}
.alert--error   { background: #fde8e8; color: #C0392B; border: 1px solid #f5b7b1; }
.alert--success { background: #e8f4ec; color: #1c6b38; border: 1px solid #b0ddbf; }

.divider {
    width: 100%;
    height: 1px;
    background: #e0ddce;
}

/* Password strength indicator */
.pw-reqs {
    display: none;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    background: #FFFDF0;
    border: 1px solid rgba(216,195,111,0.3);
    border-radius: 7px;
    margin-top: 2px;
}
.pw-req {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    color: #c0392b;
}
.pw-req.pass { color: #1c6b38; }
.pw-req__icon { font-size: 11px; font-weight: 700; }
</style>
</head>
<body>
<?php
session_start();

// If already logged in go to home
if (isset($_SESSION['logged_in'])) {
    header('Location: index.php?page=home');
    exit();
}

require_once __DIR__ . '/db/connection.php';

$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $branch_name = trim($_POST['branch_name'] ?? '');
    $full_name   = trim($_POST['full_name']   ?? '');
    $username    = trim($_POST['username']    ?? '');
    $email       = trim($_POST['email']       ?? '');
    $password    = $_POST['password']         ?? '';
    $confirm     = $_POST['confirm_password'] ?? '';

    // Validate
    if (!$branch_name || !$full_name || !$username || !$password) {
        $error = 'Please fill in all required fields.';
    } elseif (strlen($password) < 8) {
        $error = 'Password must be at least 8 characters.';
    } elseif (!preg_match('/[A-Z]/', $password)) {
        $error = 'Password must contain at least one uppercase letter.';
    } elseif (!preg_match('/[0-9]/', $password)) {
        $error = 'Password must contain at least one number.';
    } elseif (!preg_match('/[\W_]/', $password)) {
        $error = 'Password must contain at least one special character.';
    } elseif ($password !== $confirm) {
        $error = 'Passwords do not match.';
    } else {
        // Check username not taken
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute([$username]);
        if ($check->fetch()) {
            $error = 'Username is already taken. Please choose another.';
        } else {
            // Insert new branch account
            $hashed = password_hash($password, PASSWORD_BCRYPT);
            $stmt   = $pdo->prepare("
                INSERT INTO users (branch_name, full_name, username, email, password, status)
                VALUES (?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$branch_name, $full_name, $username, $email, $hashed]);
            $success = 'Branch account created! You can now log in.';
        }
    }
}
?>

<div class="card">
    <img src="assets/images/logo.png" class="logo" alt="Twist & Roll">

    <div class="card-title">Register New Branch</div>
    <div class="card-sub">Create an account for a new branch location</div>

    <?php if ($error): ?>
    <div class="alert alert--error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <?php if ($success): ?>
    <div class="alert alert--success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <?php if (!$success): ?>
    <form class="form" method="POST">

        <div class="form-group">
            <label>Branch Name <span style="color:#C0392B;">*</span></label>
            <input type="text" name="branch_name"
                   value="<?= htmlspecialchars($_POST['branch_name'] ?? '') ?>"
                   placeholder="e.g. Twist & Roll — Makati Branch" required>
        </div>

        <div class="divider"></div>

        <div class="form-group">
            <label>Cashier / Manager Full Name <span style="color:#C0392B;">*</span></label>
            <input type="text" name="full_name"
                   value="<?= htmlspecialchars($_POST['full_name'] ?? '') ?>"
                   placeholder="e.g. Juan dela Cruz" required>
        </div>

        <div class="form-group">
            <label>Username <span style="color:#C0392B;">*</span></label>
            <input type="text" name="username"
                   value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
                   placeholder="e.g. makati_branch" required>
        </div>

        <div class="form-group">
            <label>Email <span style="color:#7A7A5A;font-weight:400;">(optional)</span></label>
            <input type="email" name="email"
                   value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                   placeholder="e.g. makati@twistandroll.com">
        </div>

        <div class="form-group">
            <label>Password <span style="color:#C0392B;">*</span></label>
            <div class="pw-wrap">
                <input type="password" name="password" id="pw-input"
                       placeholder="Create a strong password" autocomplete="new-password" required>
                <button type="button" class="pw-toggle" onclick="togglePw('pw-input', this)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
            <div class="pw-reqs" id="pw-reqs">
                <div class="pw-req" id="req-len"><span class="pw-req__icon">✗</span> At least 8 characters</div>
                <div class="pw-req" id="req-upper"><span class="pw-req__icon">✗</span> At least 1 uppercase letter</div>
                <div class="pw-req" id="req-num"><span class="pw-req__icon">✗</span> At least 1 number</div>
                <div class="pw-req" id="req-spec"><span class="pw-req__icon">✗</span> At least 1 special character</div>
            </div>
        </div>

        <div class="form-group">
            <label>Confirm Password <span style="color:#C0392B;">*</span></label>
            <div class="pw-wrap">
                <input type="password" name="confirm_password" id="pw-confirm"
                       placeholder="Re-enter password" autocomplete="new-password" required>
                <button type="button" class="pw-toggle" onclick="togglePw('pw-confirm', this)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
        </div>

        <button type="submit" class="btn-submit">Create Branch Account</button>
    </form>
    <?php endif; ?>

    <div class="login-link">
        Already have an account? <a href="index.php">Log in</a>
    </div>
</div>

<script>
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const show  = input.type === 'password';
    input.type  = show ? 'text' : 'password';
    btn.innerHTML = show
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`;
}

// Live password requirements
const pwInput = document.getElementById('pw-input');
const reqs    = document.getElementById('pw-reqs');
const rules   = [
    { id: 'req-len',   test: v => v.length >= 8       },
    { id: 'req-upper', test: v => /[A-Z]/.test(v)     },
    { id: 'req-num',   test: v => /[0-9]/.test(v)     },
    { id: 'req-spec',  test: v => /[\W_]/.test(v)     },
];

pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    reqs.style.display = val ? 'flex' : 'none';
    rules.forEach(r => {
        const el   = document.getElementById(r.id);
        const pass = r.test(val);
        const icon = el.querySelector('.pw-req__icon');
        el.classList.toggle('pass', pass);
        icon.textContent = pass ? '✓' : '✗';
    });
});
</script>
</body>
</html>