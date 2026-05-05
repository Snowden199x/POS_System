<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url = '/Github/POS_SYSTEM/';
$current_page = $_GET['page'] ?? 'orders';

require_once __DIR__ . '/../../db/connection.php';

date_default_timezone_set('Asia/Manila');
$stmt = $pdo->query("
    SELECT o.*, 
           GROUP_CONCAT(oi.name ORDER BY oi.id SEPARATOR '||') AS item_names,
           GROUP_CONCAT(oi.price ORDER BY oi.id SEPARATOR '||') AS item_prices,
           GROUP_CONCAT(oi.quantity ORDER BY oi.id SEPARATOR '||') AS item_qtys
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE status = 'pending'
    GROUP BY o.id
    ORDER BY o.created_at ASC
");

$orders = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders — Twist &amp; Roll</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= $base_url ?>assets/index.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/homepage/homepage.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/orders/orders.css">
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

<div class="orders-page">

    <div class="orders-title">Orders</div>

    <div class="orders-controls">
        <div class="orders-search-wrapper">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="8" cy="8" r="7"/><line x1="13" y1="13" x2="17" y2="17"/>
            </svg>
            <input type="text" id="orderSearch" class="orders-search" placeholder="Search by order # or beeper">
        </div>
        <div class="orders-filters">
            <button class="filter active" onclick="filterOrders('all', this)">All</button>
            <button class="filter" onclick="filterOrders('dine-in', this)">Dine in</button>
            <button class="filter" onclick="filterOrders('take-out', this)">Take out</button>
        </div>
    </div>

    <div class="orders-grid" id="orders-grid">
        <?php if (empty($orders)): ?>
            <div class="orders-empty" id="empty">No pending orders yet.</div>
        <?php else: ?>
        <?php foreach ($orders as $o):
            $names  = explode('||', $o['item_names'] ?? '');
            $prices = explode('||', $o['item_prices'] ?? '');
            $qtys   = explode('||', $o['item_qtys'] ?? '');
            $time   = date('M d, g:i A', strtotime($o['created_at']));
            $type   = $o['order_type'];
            $typeLabel  = $type === 'dine-in' ? 'Dine in' : 'Take out';
            $badgeClass = $type === 'dine-in' ? 'dine' : 'takeout';
        ?>
        <div class="order-card" data-id="<?= $o['id'] ?>" data-type="<?= htmlspecialchars($type) ?>">

            <div class="order-top">
                <span class="order-id" data-beeper="<?= $o['beeper_number'] ?>">#<?= $o['beeper_number'] ?></span>
                <span class="badge <?= $badgeClass ?>"><?= $typeLabel ?></span>
            </div>

            <div class="order-items">
                <?php for ($i = 0; $i < count($names); $i++):
                    if (!$names[$i]) continue;
                ?>
                <div class="order-row">
                    <span><?= $qtys[$i] ?>x <?= htmlspecialchars($names[$i]) ?></span>
                    <span>₱<?= number_format($prices[$i] * $qtys[$i], 0) ?></span>
                </div>
                <?php endfor; ?>
            </div>

            <div class="divider"></div>

            <div class="order-extra">
                <div class="extra-row">
                    <span>Payment</span>
                    <span><?= ucfirst($o['payment_method']) ?></span>
                </div>
                <div class="extra-row">
                    <span>Subtotal</span>
                    <span>Php <?= number_format($o['subtotal'], 0) ?></span>
                </div>
                <div class="extra-row">
                    <span>Discount</span>
                    <span><?= $o['discount'] > 0 ? '−Php '.number_format($o['discount'], 0) : 'Php 0' ?></span>
                </div>
            </div>

            <div class="order-bottom">
                <div>
                    <strong>Total</strong>
                    <div class="time"><?= $time ?></div>
                </div>
                <div class="price">₱<?= number_format($o['total'], 0) ?></div>
            </div>

            <button class="serve-btn" data-id="<?= $o['id'] ?>" onclick="markServed(this)">
                Mark as served
            </button>

        </div>
        <?php endforeach; ?>
        <?php endif; ?>
    </div>

</div>

<script src="<?= $base_url ?>modules/orders/orders.js"></script>
</body>
</html>