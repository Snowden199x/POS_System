<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url     = '/Github/POS_SYSTEM/';
$current_page = 'profile';

require_once __DIR__ . '/../../db/connection.php';

// Fetch user from DB
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = 1");
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    $user = ['id'=>1,'full_name'=>'Admin','username'=>'admin',
             'email'=>'','phone'=>'','status'=>'active','avatar'=>''];
}

$success_msg = '';
$error_msg   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // ── Edit Profile ───────────────────────────────────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'edit_profile') {
        $full_name = trim($_POST['full_name'] ?? '');
        $username  = trim($_POST['username']  ?? '');
        $email     = trim($_POST['email']     ?? '');
        $phone     = trim($_POST['phone']     ?? '');

        $stmt = $pdo->prepare("UPDATE users SET full_name=?, username=?, email=?, phone=? WHERE id=1");
        $stmt->execute([$full_name, $username, $email, $phone]);

        $_SESSION['username'] = $username;
        $user['full_name'] = $full_name;
        $user['username']  = $username;
        $user['email']     = $email;
        $user['phone']     = $phone;

        $success_msg = 'Profile updated successfully.';
    }

    // ── Change Password (with strong validation) ───────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new_pw  = $_POST['new_password']     ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        // Always re-fetch password hash from DB
        $pw_stmt = $pdo->prepare("SELECT password FROM users WHERE id = 1");
        $pw_stmt->execute();
        $pw_row = $pw_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pw_row || !password_verify($current, $pw_row['password'])) {
            $error_msg = 'Current password is incorrect.';
        } elseif (strlen($new_pw) < 8) {
            $error_msg = 'Password must be at least 8 characters.';
        } elseif (!preg_match('/[A-Z]/', $new_pw)) {
            $error_msg = 'Password must contain at least one uppercase letter (A–Z).';
        } elseif (!preg_match('/[0-9]/', $new_pw)) {
            $error_msg = 'Password must contain at least one number (0–9).';
        } elseif (!preg_match('/[\W_]/', $new_pw)) {
            $error_msg = 'Password must contain at least one special character (!@#$...).';
        } elseif ($new_pw !== $confirm) {
            $error_msg = 'New passwords do not match.';
        } else {
            $hashed = password_hash($new_pw, PASSWORD_BCRYPT);
            $upd = $pdo->prepare("UPDATE users SET password = ? WHERE id = 1");
            $upd->execute([$hashed]);
            $success_msg = 'Password updated successfully.';
        }
    }

    // ── Upload Avatar ──────────────────────────────────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'upload_avatar') {
        if (!empty($_FILES['avatar']['name'])) {
            $ext      = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
            $filename = 'avatar_' . time() . '.' . $ext;
            $dest     = __DIR__ . '/../../assets/images/avatars/' . $filename;

            if (move_uploaded_file($_FILES['avatar']['tmp_name'], $dest)) {
                $avatar_path = $base_url . 'assets/images/avatars/' . $filename;
                $upd = $pdo->prepare("UPDATE users SET avatar=? WHERE id=1");
                $upd->execute([$avatar_path]);
                $user['avatar'] = $avatar_path;
                $success_msg = 'Avatar updated successfully.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile — Twist &amp; Roll</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $base_url ?>assets/index.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/homepage/homepage.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/profile/profile.css">
</head>
<body>

<header class="navbar">
    <a href="index.php?page=home" class="navbar__logo-link">
        <img src="<?= $base_url ?>assets/images/logo.png" class="navbar__logo-img" alt="Twist &amp; Roll">
    </a>
    <nav class="navbar__nav">
        <a href="index.php?page=home"       class="nav-link">Home</a>
        <a href="index.php?page=orders"     class="nav-link">Orders</a>
        <a href="index.php?page=served"     class="nav-link">Served</a>
        <a href="index.php?page=statistics" class="nav-link">Statistics</a>
        <a href="index.php?page=profile"    class="nav-link nav-link--active">Profile</a>
    </nav>
    <div class="navbar__right">
        <div class="navbar__datetime">
            <div id="current-day"  class="navbar__day"></div>
            <div id="current-date" class="navbar__date"></div>
        </div>
        <div class="profile-menu" id="profile-menu">
            <button class="profile-btn" id="profile-btn" aria-label="Profile">
                <?php if (!empty($user['avatar'])): ?>
                    <img src="<?= htmlspecialchars($user['avatar']) ?>" class="profile-icon" alt="Profile" style="object-fit:cover;border-radius:50%;">
                <?php else: ?>
                    <img src="<?= $base_url ?>assets/images/profile.png" class="profile-icon" alt="Profile">
                <?php endif; ?>
            </button>
            <div class="profile-dropdown" id="profile-dropdown">
                <a href="index.php?page=profile" class="dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Profile
                </a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item dropdown-item--danger" id="logout-btn" data-logout-url="index.php?logout=1">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    </div>
</header>

<div class="profile-page">

    <div class="profile-breadcrumb">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
        <a href="index.php?page=home" class="profile-breadcrumb__link">Home</a>
        <span class="profile-breadcrumb__sep">›</span>
        <span class="profile-breadcrumb__current">Profile</span>
    </div>

    <h1 class="profile-page__title">My Profile</h1>
    <p class="profile-page__sub">Manage your account information and security settings.</p>

    <?php if ($success_msg): ?>
    <div class="profile-alert profile-alert--success"><?= htmlspecialchars($success_msg) ?></div>
    <?php endif; ?>
    <?php if ($error_msg): ?>
    <div class="profile-alert profile-alert--error"><?= htmlspecialchars($error_msg) ?></div>
    <?php endif; ?>

    <div class="profile-layout">

        <!-- ── LEFT: Avatar card ── -->
        <div class="profile-card profile-card--avatar">
            <div class="avatar-wrap">
                <?php if (!empty($user['avatar'])): ?>
                    <img src="<?= htmlspecialchars($user['avatar']) ?>" class="avatar-img" alt="Avatar">
                <?php else: ?>
                    <div class="avatar-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                <?php endif; ?>
                <button class="avatar-cam-btn" id="avatar-cam-btn" title="Change photo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                </button>
                <form id="avatar-form" method="POST" enctype="multipart/form-data" style="display:none;">
                    <input type="hidden" name="action" value="upload_avatar">
                    <input type="file" id="avatar-input" name="avatar" accept="image/*">
                </form>
            </div>

            <div class="avatar-name"><?= htmlspecialchars($user['full_name']) ?></div>

            <button class="profile-btn-primary" id="open-edit-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Profile
            </button>
            <button class="profile-btn-secondary" id="open-pw-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Change Password
            </button>
        </div>

        <!-- ── RIGHT: Panels ── -->
        <div class="profile-right">

            <!-- Account Information -->
            <div class="profile-card" id="account-card">
                <div class="profile-card__header">
                    <div class="profile-card__header-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Account Information</span>
                    </div>
                    <button class="profile-edit-btn" id="inline-edit-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                </div>

                <!-- VIEW MODE -->
                <div id="account-view">
                    <div class="profile-fields">
                        <div class="profile-field">
                            <label class="profile-field__label">Full Name</label>
                            <div class="profile-field__value"><?= htmlspecialchars($user['full_name']) ?></div>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Phone Number</label>
                            <div class="profile-field__value"><?= htmlspecialchars($user['phone'] ?? '') ?></div>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Username</label>
                            <div class="profile-field__value"><?= htmlspecialchars($user['username']) ?></div>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Email</label>
                            <div class="profile-field__value"><?= htmlspecialchars($user['email']) ?></div>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Status</label>
                            <div class="profile-field__value">
                                <span class="profile-status profile-status--<?= strtolower($user['status'] ?? 'active') ?>">
                                    ● <?= ucfirst($user['status'] ?? 'Active') ?>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- EDIT MODE -->
                <form id="account-edit" method="POST" style="display:none;">
                    <input type="hidden" name="action" value="edit_profile">
                    <div class="profile-fields">
                        <div class="profile-field">
                            <label class="profile-field__label">Full Name</label>
                            <input class="profile-input" type="text" name="full_name" value="<?= htmlspecialchars($user['full_name']) ?>" required>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Phone Number</label>
                            <input class="profile-input" type="text" name="phone" value="<?= htmlspecialchars($user['phone'] ?? '') ?>">
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Username</label>
                            <input class="profile-input" type="text" name="username" value="<?= htmlspecialchars($user['username']) ?>" required>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Email</label>
                            <input class="profile-input" type="email" name="email" value="<?= htmlspecialchars($user['email']) ?>" required>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Status</label>
                            <div class="profile-field__value">
                                <span class="profile-status profile-status--<?= strtolower($user['status'] ?? 'active') ?>">
                                    ● <?= ucfirst($user['status'] ?? 'Active') ?>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="profile-form-actions">
                        <button type="button" class="profile-btn-secondary" id="cancel-edit-btn">Cancel</button>
                        <button type="submit" class="profile-btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>

            <!-- Security Settings -->
            <div class="profile-card" id="security-card">
                <div class="profile-card__header">
                    <div class="profile-card__header-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span>Security Settings</span>
                    </div>
                </div>

                <form id="password-form" method="POST">
                    <input type="hidden" name="action" value="change_password">
                    <div class="profile-fields profile-fields--3col">
                        <div class="profile-field">
                            <label class="profile-field__label">Current Password</label>
                            <div class="profile-pw-wrap">
                                <input class="profile-input" type="password" name="current_password" id="pw-current" placeholder="Enter current password">
                                <button type="button" class="pw-toggle" data-target="pw-current">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">New Password</label>
                            <div class="profile-pw-wrap">
                                <input class="profile-input" type="password" name="new_password" id="pw-new" placeholder="Enter new password" autocomplete="new-password">
                                <button type="button" class="pw-toggle" data-target="pw-new">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                            </div>
                            <!-- ── Live requirements checklist ── -->
                            <div class="pw-requirements" id="pw-requirements">
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
                        <div class="profile-field">
                            <label class="profile-field__label">Confirm New Password</label>
                            <div class="profile-pw-wrap">
                                <input class="profile-input" type="password" name="confirm_password" id="pw-confirm" placeholder="Confirm new password" autocomplete="new-password">
                                <button type="button" class="pw-toggle" data-target="pw-confirm">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                            </div>
                            <!-- Match indicator -->
                            <div class="pw-match" id="pw-match" style="display:none;"></div>
                        </div>
                    </div>
                    <div class="profile-form-actions profile-form-actions--right">
                        <button type="submit" class="profile-btn-gold" id="pw-submit-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Update Password
                        </button>
                    </div>
                </form>
            </div>

            <!-- Danger Zone -->
            <div class="profile-card profile-card--danger">
                <div class="profile-card__header">
                    <div class="profile-card__header-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>Danger Zone</span>
                    </div>
                </div>
                <div class="danger-row">
                    <p class="danger-desc">Logout from your account on this device.</p>
                    <button class="profile-btn-danger" id="danger-logout-btn" data-logout-url="index.php?logout=1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </div>

        </div>
    </div>
</div>

<script src="<?= $base_url ?>modules/profile/profile.js"></script>
</body>
</html>