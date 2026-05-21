<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url     = '/Github/POS_System/';
$current_page = isset($_GET['page']) ? $_GET['page'] : 'home';

require_once __DIR__ . '/../../db/connection.php';

$stmt_user = $pdo->prepare("SELECT avatar FROM users WHERE id = 1");
$stmt_user->execute();
$nav_user = $stmt_user->fetch(PDO::FETCH_ASSOC);

$menu_items = [
    ['id' => 1, 'name' => 'Eruption',           'price' => 229, 'category' => 'sushi', 'image' => 'assets/images/eruption.png'],
    ['id' => 2, 'name' => 'Cheesy Shrimp Bomb',  'price' => 169, 'category' => 'sushi', 'image' => 'assets/images/cheesyshrimp.png'],
    ['id' => 3, 'name' => 'Crazy Crab',           'price' => 159, 'category' => 'sushi', 'image' => 'assets/images/crazycrab.png'],
    ['id' => 4, 'name' => 'Tori Floss Maki',      'price' => 149, 'category' => 'sushi', 'image' => 'assets/images/torifloss.png'],
    ['id' => 5, 'name' => 'Ebi Tempura Roll',     'price' => 149, 'category' => 'sushi', 'image' => 'assets/images/ebitemp.png'],
    ['id' => 6, 'name' => 'Mango Craze',          'price' => 139, 'category' => 'sushi', 'image' => 'assets/images/mangocraze.png'],
    ['id' => 9, 'name' => 'California Maki',      'price' => 139, 'category' => 'sushi', 'image' => 'assets/images/calimaki.png'],
    ['id' => 7, 'name' => 'Garden Maki',          'price' => 179, 'category' => 'sushi', 'image' => 'assets/images/gardenmaki.png'],
    ['id' => 8, 'name' => 'Red Hot Chili Roll',   'price' => 189, 'category' => 'sushi', 'image' => 'assets/images/redhotchili.png'],
];

// Discount = floor(price × 20%)
$discount_map = [
    229 => 45,
    169 => 33,
    159 => 31,
    149 => 29,
    139 => 27,
    179 => 36,
    189 => 38,
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twist &amp; Roll POS</title>
    <link rel="stylesheet" href="<?= $base_url ?>assets/index.css">
    <link rel="stylesheet" href="<?= $base_url ?>modules/homepage/homepage.css">
    <script>
        const DISCOUNT_MAP = <?= json_encode($discount_map) ?>;
        const MENU_ITEMS   = <?= json_encode(array_column($menu_items, null, 'id')) ?>;
    </script>
</head>
<body>

<div class="toast-container" id="toast-container"></div>

<header class="navbar">
    <a href="index.php?page=home" class="navbar__logo-link">
        <img src="<?= $base_url ?>assets/images/logo.png" alt="Twist &amp; Roll" class="navbar__logo-img">
    </a>
    <nav class="navbar__nav">
        <a href="index.php?page=home"       class="nav-link <?= $current_page==='home'       ?'nav-link--active':'' ?>">Home</a>
        <a href="index.php?page=orders"     class="nav-link <?= $current_page==='orders'     ?'nav-link--active':'' ?>">Orders</a>
        <a href="index.php?page=served"     class="nav-link <?= $current_page==='served'     ?'nav-link--active':'' ?>">Served</a>
        <a href="index.php?page=statistics" class="nav-link <?= $current_page==='statistics' ?'nav-link--active':'' ?>">Statistics</a>
    </nav>
    <div class="navbar__right">
        <div class="navbar__datetime">
            <div class="navbar__day"  id="current-day"></div>
            <div class="navbar__date" id="current-date"></div>
        </div>
        <div class="profile-menu" id="profile-menu">
            <button class="profile-btn" id="profile-btn" aria-label="Profile">
                <?php if (!empty($nav_user['avatar'])): ?>
                    <img src="<?= htmlspecialchars($nav_user['avatar']) ?>" class="profile-icon" alt="Profile" style="object-fit:cover;border-radius:50%;">
                <?php else: ?>
                    <img src="<?= $base_url ?>assets/images/profile.png" class="profile-icon" alt="Profile">
                <?php endif; ?>
            </button>
            <div class="profile-dropdown" id="profile-dropdown">
                <a href="index.php?page=profile" class="dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
                    </svg>
                    Profile
                </a>
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

<main class="pos-layout">

    <section class="menu-panel">
        <h2 class="menu-panel__title">Menu</h2>
        <div class="menu-grid" id="menu-grid">
            <?php foreach ($menu_items as $item): ?>
            <div class="menu-card"
                 data-id="<?= $item['id'] ?>"
                 data-name="<?= htmlspecialchars($item['name']) ?>"
                 data-price="<?= $item['price'] ?>"
                 data-category="<?= $item['category'] ?>">
                <div class="menu-card__image-wrap">
                    <img src="<?= $base_url . htmlspecialchars($item['image']) ?>"
                         alt="<?= htmlspecialchars($item['name']) ?>"
                         class="menu-card__image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="menu-card__image-placeholder" style="display:none;">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </div>
                </div>
                <div class="menu-card__info">
                    <span class="menu-card__name"><?= htmlspecialchars($item['name']) ?></span>
                    <span class="menu-card__price">Php <?= number_format($item['price']) ?></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </section>

    <aside class="order-panel">

        <div class="order-panel__type">
            <button class="type-btn type-btn--active" data-type="dine-in">Dine in</button>
            <button class="type-btn" data-type="take-out">Take out</button>
        </div>

        <div class="order-panel__beeper" id="beeper-wrap">
            <label class="beeper-label" for="beeper-input">Beeper #</label>
            <input type="number" class="beeper-input" id="beeper-input" min="1" placeholder="Enter number">
        </div>
        <p class="beeper-error-msg" id="beeper-error">Beeper number is required.</p>

        <div class="order-items-section">
            <p class="order-items-label">ORDER ITEMS</p>
            <div class="order-items-list" id="order-items-list">
                <div class="order-empty" id="order-empty">
                    <svg class="order-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <span class="order-empty__text">No items yet</span>
                    <span class="order-empty__sub">Tap menu items to add</span>
                </div>
            </div>
        </div>

        <div class="payment-summary">
            <p class="payment-summary__title">PAYMENT SUMMARY</p>
            <div class="payment-summary__row">
                <span class="discount-label">Discount</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="discount-toggle">
                    <span class="toggle-slider"></span>
                </label>
                <span class="discount-value" id="discount-value">Php 0</span>
            </div>
            <div class="payment-summary__row">
                <span>Subtotal</span>
                <span class="subtotal-value-normal" id="subtotal-value">Php 0</span>
            </div>
            <div class="payment-summary__divider"></div>
            <div class="payment-summary__total">
                <span>Total</span>
                <span class="total-amount" id="total-value">Php 0.00</span>
            </div>
        </div>

        <div class="payment-methods">
            <button class="payment-btn payment-btn--active" data-method="cash">Cash</button>
            <button class="payment-btn" data-method="gcash">Gcash</button>
        </div>

        <div class="amount-input-wrap" id="amount-wrap">
            <input type="number" class="amount-input" id="amount-input" placeholder="Php 0.00" step="1" min="0">
        </div>

        <div id="gcash-wrap" style="display:none;">
            <div class="order-panel__beeper" id="gcash-ref-wrap">
                <label class="beeper-label" for="gcash-ref" style="white-space:nowrap;">Ref #</label>
                <input type="text" class="beeper-input" id="gcash-ref" placeholder="GCash reference number" maxlength="50">
            </div>
            <p class="beeper-error-msg" id="gcash-ref-error">GCash reference number is required.</p>
        </div>

        <div class="change-display" id="change-display" style="display:none;">
            <span class="change-display__label">Change</span>
            <span class="change-display__amount" id="change-amount">Php 0.00</span>
        </div>

        <button class="place-order-btn" id="place-order-btn" disabled>
            Place order – Php 0.00
        </button>

    </aside>
</main>

<script src="<?= $base_url ?>assets/js/main.js"></script>
<script src="<?= $base_url ?>modules/homepage/homepage.js"></script>
</body>
</html>