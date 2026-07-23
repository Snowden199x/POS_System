<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url     = '/Github/POS_SYSTEM/';
$current_page = 'profile';

require_once __DIR__ . '/../../db/connection.php';

// ── Branch ────────────────────────────────────────────────────────────────
$branch_id = $_SESSION['user_id'] ?? 1;

// ── Fetch user ─────────────────────────────────────────────────────────────
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$branch_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    $user = ['id'=>1,'full_name'=>'Admin','username'=>'admin',
             'email'=>'','phone'=>'','status'=>'active','avatar'=>''];
}

// ── Fetch receipt settings (auto-create row if missing) ───────────────────
$rs_stmt = $pdo->query("SELECT * FROM receipt_settings WHERE id = 1");
$receipt = $rs_stmt->fetch(PDO::FETCH_ASSOC);
if (!$receipt) {
    $pdo->exec("
        INSERT INTO receipt_settings
            (id, store_name, store_address, store_contact,
             receipt_header, receipt_footer,
             show_discount, show_cashier, show_order_type, show_beeper)
        VALUES
            (1, 'Twist & Roll', '', '',
             '', 'Thank you for dining with us!',
             1, 1, 1, 1)
    ");
    $rs_stmt = $pdo->query("SELECT * FROM receipt_settings WHERE id = 1");
    $receipt = $rs_stmt->fetch(PDO::FETCH_ASSOC);
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

        $stmt = $pdo->prepare("UPDATE users SET full_name=?, username=?, email=?, phone=? WHERE id=?");
        $stmt->execute([$full_name, $username, $email, $phone, $branch_id]);

        $_SESSION['username']  = $username;
        $user['full_name']     = $full_name;
        $user['username']      = $username;
        $user['email']         = $email;
        $user['phone']         = $phone;

        $success_msg = 'Profile updated successfully.';
    }

    // ── Change Password ────────────────────────────────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new_pw  = $_POST['new_password']     ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        $pw_stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $pw_stmt->execute([$branch_id]);
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
            $upd = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
            $upd->execute([$hashed, $branch_id]);
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
                $upd = $pdo->prepare("UPDATE users SET avatar=? WHERE id=?");
                $upd->execute([$avatar_path, $branch_id]);
                $user['avatar'] = $avatar_path;
                $success_msg    = 'Avatar updated successfully.';
            }
        }
    }

    // ── Upload Store Logo ──────────────────────────────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'upload_logo') {
        if (!empty($_FILES['logo']['name'])) {
            $ext      = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
            $filename = 'logo_' . time() . '.' . $ext;
            $dest     = __DIR__ . '/../../assets/images/' . $filename;

            if (move_uploaded_file($_FILES['logo']['tmp_name'], $dest)) {
                $logo_path = 'assets/images/' . $filename;
                $upd = $pdo->prepare("UPDATE receipt_settings SET logo_path = ? WHERE id = 1");
                $upd->execute([$logo_path]);
                $receipt['logo_path'] = $logo_path;
                $success_msg = 'Logo updated successfully.';
            }
        }
    }

    // ── Save Receipt Settings ──────────────────────────────────────────────
    if (isset($_POST['action']) && $_POST['action'] === 'save_receipt') {
        $store_address   = trim($_POST['store_address']   ?? '');
        $store_contact   = trim($_POST['store_contact']   ?? '');
        $fb_page_url     = trim($_POST['fb_page_url']      ?? '');
        $receipt_header  = trim($_POST['receipt_header']  ?? '');
        $receipt_footer  = trim($_POST['receipt_footer']  ?? '');
        $show_discount   = isset($_POST['show_discount'])  ? 1 : 0;
        $show_cashier    = isset($_POST['show_cashier'])   ? 1 : 0;
        $show_order_type = isset($_POST['show_order_type'])? 1 : 0;
        $show_beeper     = isset($_POST['show_beeper'])    ? 1 : 0;
        $dark_mode       = isset($_POST['dark_mode'])       ? 1 : 0;

        $rs_upd = $pdo->prepare("
            UPDATE receipt_settings SET
                store_address   = ?,
                store_contact   = ?,
                fb_page_url     = ?,
                receipt_header  = ?,
                receipt_footer  = ?,
                show_discount   = ?,
                show_cashier    = ?,
                show_order_type = ?,
                show_beeper     = ?,
                dark_mode       = ?
            WHERE id = 1
        ");
        $rs_upd->execute([
            $store_address, $store_contact, $fb_page_url,
            $receipt_header, $receipt_footer,
            $show_discount, $show_cashier, $show_order_type, $show_beeper,
            $dark_mode,
        ]);

        // Refresh local var
        $receipt['store_address']   = $store_address;
        $receipt['store_contact']   = $store_contact;
        $receipt['fb_page_url']     = $fb_page_url;
        $receipt['receipt_header']  = $receipt_header;
        $receipt['receipt_footer']  = $receipt_footer;
        $receipt['show_discount']   = $show_discount;
        $receipt['show_cashier']    = $show_cashier;
        $receipt['show_order_type'] = $show_order_type;
        $receipt['show_beeper']     = $show_beeper;
        $receipt['dark_mode']       = $dark_mode;

        $success_msg = 'Receipt settings saved successfully.';
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="<?= !empty($receipt['dark_mode']) ? 'dark' : 'light' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile — Twist &amp; Roll</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $base_url ?>assets/index.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/homepage/homepage.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/profile/profile.css">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1C3924">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="apple-touch-icon" href="/assets/images/icon-192.png">
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
    <p class="profile-page__sub">Manage your account information, security settings, and receipt preferences.</p>

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
            <button class="profile-btn-secondary" id="open-receipt-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Receipt Settings
            </button>
        </div>

        <!-- ── RIGHT: Panels ── -->
        <div class="profile-right">

            <!-- ── Account Information ── -->
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

            <!-- ── Security Settings ── -->
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
                            <div class="pw-requirements" id="pw-requirements">
                                <div class="pw-req" id="req-length"><span class="pw-req__icon">✗</span><span>At least 8 characters</span></div>
                                <div class="pw-req" id="req-upper"><span class="pw-req__icon">✗</span><span>At least 1 uppercase letter (A–Z)</span></div>
                                <div class="pw-req" id="req-number"><span class="pw-req__icon">✗</span><span>At least 1 number (0–9)</span></div>
                                <div class="pw-req" id="req-special"><span class="pw-req__icon">✗</span><span>At least 1 special character (!@#$...)</span></div>
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

            <!-- ══════════════════════════════════════════════
                 RECEIPT SETTINGS CARD
                 ══════════════════════════════════════════════ -->
            <div class="profile-card" id="receipt-card">
                <div class="profile-card__header">
                    <div class="profile-card__header-left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>Receipt Settings</span>
                    </div>
                </div>

                <form method="POST" id="receipt-form">
                    <input type="hidden" name="action" value="save_receipt">

                    <!-- Store Logo -->
                    <p class="receipt-section-label">Store Logo</p>
                    <div class="logo-upload-row">
                        <div class="logo-thumb" id="logo-thumb">
                            <img src="<?= htmlspecialchars($base_url . (!empty($receipt['logo_path']) ? $receipt['logo_path'] : 'assets/images/logo.png')) ?>"
                                 id="logo-preview-img" alt="Store logo">
                        </div>
                        <div class="logo-upload-actions">
                            <button type="button" class="profile-btn-secondary" id="logo-upload-btn" style="width:auto;padding:9px 18px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Upload Logo
                            </button>
                            <span class="label-optional">Shown on the receipt instead of a plain store name.</span>
                        </div>
                        <form id="logo-form" method="POST" enctype="multipart/form-data" style="display:none;">
                            <input type="hidden" name="action" value="upload_logo">
                            <input type="file" id="logo-input" name="logo" accept="image/*">
                        </form>
                    </div>

                    <!-- Store Info -->
                    <p class="receipt-section-label" style="margin-top:18px;">Store Information</p>
                    <div class="profile-fields profile-fields--2col">
                        <div class="profile-field profile-field--full">
                            <label class="profile-field__label">Facebook Page URL <span class="label-optional">(shown as a QR code on the receipt)</span></label>
                            <input class="profile-input" type="url" name="fb_page_url"
                                   value="<?= htmlspecialchars($receipt['fb_page_url'] ?? '') ?>"
                                   placeholder="https://www.facebook.com/...">
                        </div>
                        <div class="profile-field">
                            <label class="profile-field__label">Contact Number</label>
                            <input class="profile-input" type="text" name="store_contact"
                                   value="<?= htmlspecialchars($receipt['store_contact'] ?? '') ?>"
                                   placeholder="e.g. 0917-123-4567">
                        </div>
                        <div class="profile-field profile-field--full">
                            <label class="profile-field__label">Address</label>
                            <input class="profile-input" type="text" name="store_address"
                                   value="<?= htmlspecialchars($receipt['store_address'] ?? '') ?>"
                                   placeholder="e.g. 123 Main St, City">
                        </div>
                    </div>

                    <!-- Appearance -->
                    <p class="receipt-section-label" style="margin-top:18px;">Appearance</p>
                    <div class="receipt-toggles">
                        <label class="receipt-toggle-row">
                            <span class="receipt-toggle-label">Dark mode</span>
                            <label class="toggle-switch">
                                <input type="checkbox" name="dark_mode" id="dark-mode-toggle" <?= !empty($receipt['dark_mode']) ? 'checked' : '' ?>>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                    </div>

                    <!-- Receipt Text -->
                    <p class="receipt-section-label" style="margin-top:18px;">Receipt Text</p>
                    <div class="profile-fields profile-fields--2col">
                        <div class="profile-field profile-field--full">
                            <label class="profile-field__label">Header Message <span class="label-optional">(optional — shown above items)</span></label>
                            <input class="profile-input" type="text" name="receipt_header"
                                   value="<?= htmlspecialchars($receipt['receipt_header'] ?? '') ?>"
                                   placeholder="e.g. Official Receipt">
                        </div>
                        <div class="profile-field profile-field--full">
                            <label class="profile-field__label">Footer Message <span class="label-optional">(shown at the bottom)</span></label>
                            <input class="profile-input" type="text" name="receipt_footer"
                                   value="<?= htmlspecialchars($receipt['receipt_footer'] ?? '') ?>"
                                   placeholder="e.g. Thank you for dining with us!">
                        </div>
                    </div>

                    <!-- Show/Hide Toggles -->
                    <p class="receipt-section-label" style="margin-top:18px;">Show on Receipt</p>
                    <div class="receipt-toggles">
                        <label class="receipt-toggle-row">
                            <span class="receipt-toggle-label">Discount line</span>
                            <label class="toggle-switch">
                                <input type="checkbox" name="show_discount" <?= $receipt['show_discount'] ? 'checked' : '' ?>>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                        <label class="receipt-toggle-row">
                            <span class="receipt-toggle-label">Cashier name</span>
                            <label class="toggle-switch">
                                <input type="checkbox" name="show_cashier" <?= $receipt['show_cashier'] ? 'checked' : '' ?>>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                        <label class="receipt-toggle-row">
                            <span class="receipt-toggle-label">Order type (Dine in / Take out)</span>
                            <label class="toggle-switch">
                                <input type="checkbox" name="show_order_type" <?= $receipt['show_order_type'] ? 'checked' : '' ?>>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                        <label class="receipt-toggle-row">
                            <span class="receipt-toggle-label">Beeper number</span>
                            <label class="toggle-switch">
                                <input type="checkbox" name="show_beeper" <?= $receipt['show_beeper'] ? 'checked' : '' ?>>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                    </div>

                    <!-- Receipt Preview -->
                    <p class="receipt-section-label" style="margin-top:18px;">Preview</p>
                    <div class="receipt-preview" id="receipt-preview">
                        <img class="rp-logo" id="rp-logo"
                             src="<?= htmlspecialchars($base_url . (!empty($receipt['logo_path']) ? $receipt['logo_path'] : 'assets/images/logo.png')) ?>"
                             alt="Store logo">
                        <?php if (!empty($receipt['store_address'])): ?>
                        <div class="rp-line" id="rp-address"><?= htmlspecialchars($receipt['store_address']) ?></div>
                        <?php else: ?>
                        <div class="rp-line rp-placeholder" id="rp-address">Address goes here</div>
                        <?php endif; ?>
                        <?php if (!empty($receipt['store_contact'])): ?>
                        <div class="rp-line" id="rp-contact"><?= htmlspecialchars($receipt['store_contact']) ?></div>
                        <?php else: ?>
                        <div class="rp-line rp-placeholder" id="rp-contact">Contact number</div>
                        <?php endif; ?>
                        <?php if (!empty($receipt['receipt_header'])): ?>
                        <div class="rp-divider"></div>
                        <div class="rp-line rp-header" id="rp-header"><?= htmlspecialchars($receipt['receipt_header']) ?></div>
                        <?php else: ?>
                        <div class="rp-divider"></div>
                        <div class="rp-line rp-placeholder rp-header" id="rp-header"></div>
                        <?php endif; ?>
                        <div class="rp-divider"></div>
                        <div class="rp-row"><span>1x Eruption</span><span>Php 229</span></div>
                        <div class="rp-row"><span>2x Mango Craze</span><span>Php 278</span></div>
                        <div class="rp-divider"></div>
                        <div class="rp-row"><span>Subtotal</span><span>Php 507</span></div>
                        <div class="rp-row rp-discount" id="rp-discount-row" style="<?= $receipt['show_discount'] ? '' : 'display:none' ?>">
                            <span>Discount</span><span>−Php 27</span>
                        </div>
                        <div class="rp-row rp-total"><span>TOTAL</span><span>Php 480</span></div>
                        <div class="rp-divider"></div>
                        <div class="rp-row rp-meta" id="rp-order-type-row" style="<?= $receipt['show_order_type'] ? '' : 'display:none' ?>">
                            <span>Order Type</span><span>Dine In</span>
                        </div>
                        <div class="rp-row rp-meta" id="rp-beeper-row" style="<?= $receipt['show_beeper'] ? '' : 'display:none' ?>">
                            <span>Beeper #</span><span>7</span>
                        </div>
                        <div class="rp-row rp-meta" id="rp-cashier-row" style="<?= $receipt['show_cashier'] ? '' : 'display:none' ?>">
                            <span>Cashier</span><span><?= htmlspecialchars($user['full_name']) ?></span>
                        </div>
                        <div class="rp-divider"></div>
                        <div class="rp-footer" id="rp-footer"><?= htmlspecialchars($receipt['receipt_footer'] ?? 'Thank you for dining with us!') ?></div>
                        <?php if (!empty($receipt['fb_page_url'])): ?>
                        <div class="rp-qr-wrap" id="rp-qr-wrap" data-fb-url="<?= htmlspecialchars($receipt['fb_page_url']) ?>">
                            <div class="rp-qr" id="rp-qr"></div>
                            <div class="rp-line">Follow us on Facebook</div>
                        </div>
                        <?php else: ?>
                        <div class="rp-qr-wrap" id="rp-qr-wrap" data-fb-url="" style="display:none;">
                            <div class="rp-qr" id="rp-qr"></div>
                            <div class="rp-line">Follow us on Facebook</div>
                        </div>
                        <?php endif; ?>
                    </div>

                    <div class="profile-form-actions profile-form-actions--right" style="margin-top:18px;">
                        <button type="submit" class="profile-btn-gold">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Save Receipt Settings
                        </button>
                    </div>
                </form>
            </div>

            <!-- ── Danger Zone ── -->
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

        </div><!-- /.profile-right -->
    </div><!-- /.profile-layout -->
</div><!-- /.profile-page -->

<script src="<?= $base_url ?>assets/js/vendor/qrcode.js"></script>
<script src="<?= $base_url ?>assets/js/vendor/qrcode_UTF8.js"></script>
<script src="<?= $base_url ?>modules/profile/profile.js"></script>
<script src="/assets/js/pwa_register.js"></script>
</body>
</html>