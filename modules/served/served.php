<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url = '/Github/POS_SYSTEM/';
$current_page = $_GET['page'] ?? 'served';

require_once __DIR__ . '/../../db/connection.php';

date_default_timezone_set('Asia/Manila');

$now = new DateTime();

// compute last Monday 2AM
$lastReset = new DateTime();
$lastReset->modify('monday this week');
$lastReset->setTime(2, 0, 0);

// kung di pa umaabot ng Monday 2AM ngayon
if ($now < $lastReset) {
    $lastReset->modify('-7 days');
}

$reset_datetime = $lastReset->format('Y-m-d H:i:s');

// ✅ TAMANG QUERY (prepare lang, walang query())
$stmt = $pdo->prepare("
    SELECT o.*, 
           GROUP_CONCAT(oi.name ORDER BY oi.id SEPARATOR '||') AS item_names,
           GROUP_CONCAT(oi.price ORDER BY oi.id SEPARATOR '||') AS item_prices,
           GROUP_CONCAT(oi.quantity ORDER BY oi.id SEPARATOR '||') AS item_qtys
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'served'
    AND o.served_at >= ?
    GROUP BY o.id
    ORDER BY o.served_at DESC, o.created_at DESC
");

$stmt->execute([$reset_datetime]);
$served_orders = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Served — Twist &amp; Roll</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $base_url ?>assets/index.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/homepage/homepage.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/served/served.css">
</head>
<body>

<header class="navbar">
    <img src="<?= $base_url ?>assets/images/logo.png" class="navbar__logo-img" alt="Twist & Roll">
    <nav class="navbar__nav">
        <a href="index.php?page=home"       class="nav-link <?= $current_page==='home'       ? 'nav-link--active':'' ?>">Home</a>
        <a href="index.php?page=orders"     class="nav-link <?= $current_page==='orders'     ? 'nav-link--active':'' ?>">Orders</a>
        <a href="index.php?page=served"     class="nav-link <?= $current_page==='served'     ? 'nav-link--active':'' ?>">Served</a>
        <a href="index.php?page=statistics" class="nav-link <?= $current_page==='statistics' ? 'nav-link--active':'' ?>">Statistics</a>
    </nav>
    <div class="navbar__right">
        <div class="navbar__datetime">
            <div id="current-day"  class="navbar__day"></div>
            <div id="current-date" class="navbar__date"></div>
        </div>
        <div class="profile-menu">
            <button id="profile-btn" class="profile-btn">
                <img src="<?= $base_url ?>assets/images/profile.png" class="profile-icon" alt="Profile">
            </button>
            <div class="profile-dropdown" id="profile-dropdown">
                <button class="logout-btn" id="logout-btn" data-logout-url="index.php?logout=1">
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

<div class="served-page">

    <div class="served-title">Served</div>

    <div style="font-size:12px; color:#777; margin-bottom:10px;">
    Showing served orders since <?= date('M d, Y h:i A', strtotime($reset_datetime)) ?>
</div>

    <div class="served-controls">
        <div class="served-search-wrapper">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="7" cy="7" r="6"/><line x1="11" y1="11" x2="15" y2="15"/>
            </svg>
            <input type="text" id="servedSearch" class="served-search" placeholder="Search orders">
        </div>
        <div class="served-filters">
            <button class="served-filter active" data-filter="all">All</button>
            <button class="served-filter" data-filter="dine-in">Dine in</button>
            <button class="served-filter" data-filter="take-out">Take out</button>
        </div>
    </div>

    <div class="served-grid" id="served-grid">

        <?php if (empty($served_orders)): ?>
        <div class="served-empty" id="served-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <p>No served orders yet.</p>
        </div>
        <?php else: ?>

        <?php foreach ($served_orders as $o):
            $names   = explode('||', $o['item_names'] ?? '');
            $prices  = explode('||', $o['item_prices'] ?? '');
            $qtys    = explode('||', $o['item_qtys'] ?? '');
            $ordered = date('M d, g:i A', strtotime($o['created_at']));
            $served  = !empty($o['served_at']) ? date('M d, g:i A', strtotime($o['served_at'])) : '—';
            $type      = $o['order_type'];
            $typeLabel = $type === 'dine-in' ? 'Dine in' : 'Take out';
            $badgeClass = $type === 'dine-in' ? 'dine' : 'takeout';
        ?>

        <div class="served-card" data-type="<?= htmlspecialchars($type) ?>">

            <div class="served-card__top">
                <span class="served-status">✓ Served</span>
                <span class="served-type-badge <?= $badgeClass ?>"><?= $typeLabel ?></span>
                <?php if ($o['beeper_number']): ?>
                <span class="served-beeper">#<?= $o['beeper_number'] ?></span>
                <?php endif; ?>
            </div>

            <div class="served-card__items">
                <?php for ($i = 0; $i < count($names); $i++):
                    if (!$names[$i]) continue;
                ?>
                <div class="served-card__row">
                    <span><?= $qtys[$i] ?>x <?= htmlspecialchars($names[$i]) ?></span>
                    <span>Php <?= number_format($prices[$i] * $qtys[$i], 0) ?></span>
                </div>
                <?php endfor; ?>
            </div>

            <div class="served-card__divider"></div>

            <div class="served-card__meta">
                <div class="served-meta-row">
                    <span>Mode of Payment</span>
                    <span><?= ucfirst($o['payment_method']) ?></span>
                </div>
                <div class="served-meta-row">
                    <span>Subtotal</span>
                    <span>Php <?= number_format($o['subtotal'], 0) ?></span>
                </div>
                <?php if ($o['discount'] > 0): ?>
                <div class="served-meta-row">
                    <span>Discount</span>
                    <span class="served-discount">−Php <?= number_format($o['discount'], 0) ?></span>
                </div>
                <?php endif; ?>
            </div>

            <div class="served-card__total">
                <strong>Total</strong>
                <span class="served-total-price">Php <?= number_format($o['total'], 2) ?></span>
            </div>

            <div class="served-card__footer">
                Ordered: <?= $ordered ?> &nbsp;·&nbsp; Served: <?= $served ?>
            </div>

        </div>
        <?php endforeach; ?>
        <?php endif; ?>

    </div>

    <!-- PAGINATION -->
    <div class="pagination" id="pagination"></div>
</div>

<script src="<?= $base_url ?>modules/served/served.js"></script>
</body>
</html>