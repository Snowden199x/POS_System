<?php
/**
 * @var bool   $valid_token
 * @var string $token
 * @var string $email
 * @var array  $alert
 */
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twist & Roll — Reset Password</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="reset_password.css">
</head>
<body>

<div class="card">
    <img src="../../assets/images/logo.png" class="card__logo" alt="Twist & Roll">

    <div class="card__title">Reset Password</div>
    <p class="card__sub">Enter your new password below.</p>

    <?php if (!empty($alert)): ?>
        <div class="alert alert--<?= $alert['type'] ?>">
            <?= htmlspecialchars($alert['message']) ?>
        </div>
    <?php endif; ?>

    <?php if ($valid_token): ?>
    <form class="form" method="POST" action="reset_password_handler.php">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
        <input type="hidden" name="email" value="<?= htmlspecialchars($email) ?>">

        <div class="form-group">
            <label>New Password</label>
            <div class="pw-wrap">
                <input type="password" name="new_password" id="pw-new" placeholder="Enter new password" autocomplete="new-password" required>
                <button type="button" class="pw-toggle" data-target="pw-new">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
            <div class="pw-requirements">
                <div class="pw-req" id="req-length">
                    <span class="pw-req__icon">✗</span>
                    <span>At least 8 characters</span>
                </div>
                <div class="pw-req" id="req-upper">
                    <span class="pw-req__icon">✗</span>
                    <span>At least 1 uppercase letter (A–Z)</span>
                </div>
                <div class="pw-req" id="req-number">
                    <span class="pw-req__icon">✗</span>
                    <span>At least 1 number (0–9)</span>
                </div>
                <div class="pw-req" id="req-special">
                    <span class="pw-req__icon">✗</span>
                    <span>At least 1 special character (!@#$...)</span>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label>Confirm New Password</label>
            <div class="pw-wrap">
                <input type="password" name="confirm_password" id="pw-confirm" placeholder="Confirm new password" autocomplete="new-password" required>
                <button type="button" class="pw-toggle" data-target="pw-confirm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>
            <div class="pw-match" id="pw-match" style="display:none;"></div>
        </div>

        <button type="submit" class="btn-submit">Reset Password</button>
    </form>
    <?php endif; ?>

    <a href="../../index.php" class="back-link">← Back to Login</a>
</div>

<script>
// Password toggle
document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// Live requirements
const pwNew = document.getElementById('pw-new');
if (pwNew) {
    pwNew.addEventListener('input', () => {
        const val = pwNew.value;
        toggle('req-length',  val.length >= 8);
        toggle('req-upper',   /[A-Z]/.test(val));
        toggle('req-number',  /[0-9]/.test(val));
        toggle('req-special', /[\W_]/.test(val));
    });
}

// Match indicator
const pwConfirm = document.getElementById('pw-confirm');
const pwMatch   = document.getElementById('pw-match');
if (pwConfirm) {
    pwConfirm.addEventListener('input', () => {
        if (pwConfirm.value === '') {
            pwMatch.style.display = 'none';
            return;
        }
        pwMatch.style.display = 'block';
        if (pwNew.value === pwConfirm.value) {
            pwMatch.textContent = '✓ Passwords match';
            pwMatch.className = 'pw-match match';
        } else {
            pwMatch.textContent = '✗ Passwords do not match';
            pwMatch.className = 'pw-match no-match';
        }
    });
}

function toggle(id, valid) {
    const el   = document.getElementById(id);
    const icon = el.querySelector('.pw-req__icon');
    if (valid) {
        el.classList.add('valid');
        icon.textContent = '✓';
    } else {
        el.classList.remove('valid');
        icon.textContent = '✗';
    }
}
</script>

</body>
</html>