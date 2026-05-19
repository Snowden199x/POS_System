<?php
if (!isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php");
    exit();
}

$base_url     = '/Github/POS_SYSTEM/';
$current_page = $_GET['page'] ?? 'orders';

require_once __DIR__ . '/../../db/connection.php';

$stmt_user = $pdo->prepare("SELECT avatar FROM users WHERE id = 1");
$stmt_user->execute();
$nav_user = $stmt_user->fetch(PDO::FETCH_ASSOC);

date_default_timezone_set('Asia/Manila');
$stmt = $pdo->query("
    SELECT o.*,
           GROUP_CONCAT(oi.name         ORDER BY oi.id SEPARATOR '||') AS item_names,
           GROUP_CONCAT(oi.price        ORDER BY oi.id SEPARATOR '||') AS item_prices,
           GROUP_CONCAT(oi.quantity     ORDER BY oi.id SEPARATOR '||') AS item_qtys,
           GROUP_CONCAT(oi.menu_item_id ORDER BY oi.id SEPARATOR '||') AS item_ids
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'pending'
    GROUP BY o.id
    ORDER BY o.created_at ASC
");
$orders = $stmt->fetchAll();

$menu_items = [
    ['id'=>1,'name'=>'Eruption',          'price'=>229,'category'=>'sushi','image'=>'assets/images/eruption.png'],
    ['id'=>2,'name'=>'Cheesy Shrimp Bomb','price'=>169,'category'=>'sushi','image'=>'assets/images/cheesyshrimp.png'],
    ['id'=>3,'name'=>'Crazy Crab',         'price'=>159,'category'=>'sushi','image'=>'assets/images/crazycrab.png'],
    ['id'=>4,'name'=>'Tori Floss Maki',    'price'=>149,'category'=>'sushi','image'=>'assets/images/torifloss.png'],
    ['id'=>5,'name'=>'Ebi Tempura Roll',   'price'=>149,'category'=>'sushi','image'=>'assets/images/ebitemp.png'],
    ['id'=>6,'name'=>'Mango Craze',        'price'=>139,'category'=>'sushi','image'=>'assets/images/mangocraze.png'],
    ['id'=>7,'name'=>'Garden Maki',        'price'=>179,'category'=>'sushi','image'=>'assets/images/gardenmaki.png'],
    ['id'=>8,'name'=>'Red Hot Chili Roll', 'price'=>189,'category'=>'sushi','image'=>'assets/images/redhotchili.png'],
];

$discount_map = [229=>45,169=>33,159=>31,149=>29,139=>27,179=>36,189=>38];
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
    <script>
        const MENU_ITEMS   = <?= json_encode(array_values($menu_items)) ?>;
        const DISCOUNT_MAP = <?= json_encode($discount_map) ?>;
        const BASE_URL     = '<?= $base_url ?>';
    </script>
</head>
<body>

<header class="navbar">
    <a href="index.php?page=home" style="display:flex;align-items:center;">
        <img src="<?= $base_url ?>assets/images/logo.png" class="navbar__logo-img" alt="Twist & Roll">
    </a>
    <nav class="navbar__nav">
        <a href="index.php?page=home"       class="nav-link <?= $current_page==='home'       ?'nav-link--active':'' ?>">Home</a>
        <a href="index.php?page=orders"     class="nav-link <?= $current_page==='orders'     ?'nav-link--active':'' ?>">Orders</a>
        <a href="index.php?page=served"     class="nav-link <?= $current_page==='served'     ?'nav-link--active':'' ?>">Served</a>
        <a href="index.php?page=statistics" class="nav-link <?= $current_page==='statistics' ?'nav-link--active':'' ?>">Statistics</a>
    </nav>
    <div class="navbar__right">
        <div class="navbar__datetime">
            <div id="current-day"  class="navbar__day"></div>
            <div id="current-date" class="navbar__date"></div>
        </div>
        <div class="profile-menu">
            <button id="profile-btn" class="profile-btn">
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
            $names  = explode('||', $o['item_names']  ?? '');
            $prices = explode('||', $o['item_prices'] ?? '');
            $qtys   = explode('||', $o['item_qtys']   ?? '');
            $ids    = explode('||', $o['item_ids']    ?? '');
            $time   = date('M d, g:i A', strtotime($o['created_at']));
            $type       = $o['order_type'];
            $typeLabel  = $type === 'dine-in' ? 'Dine in' : 'Take out';
            $badgeClass = $type === 'dine-in' ? 'dine' : 'takeout';
            $orderLabel = $o['beeper_number'] ? '#'.$o['beeper_number'] : 'Order #'.str_pad($o['id'],4,'0',STR_PAD_LEFT);

            $itemsJson = [];
            for ($i = 0; $i < count($names); $i++) {
                if (!$names[$i]) continue;
                $itemsJson[] = [
                    'id'    => (int)($ids[$i] ?? 0),
                    'name'  => $names[$i],
                    'price' => (int)$prices[$i],
                    'qty'   => (int)$qtys[$i],
                ];
            }
        ?>
        <div class="order-card" data-id="<?= $o['id'] ?>" data-type="<?= htmlspecialchars($type) ?>">
            <div class="order-top">
                <div class="order-top-left">
                    <span class="order-id" data-beeper="<?= $o['beeper_number'] ?>">#<?= $o['beeper_number'] ?></span>
                </div>
                <div class="order-top-right">
                    <span class="badge <?= $badgeClass ?>"><?= $typeLabel ?></span>
                    <div class="order-menu-wrapper">
                        <button class="order-menu-btn">⋮</button>
                        <div class="order-menu">
                            <button class="edit-order-btn"
                                data-id="<?= $o['id'] ?>"
                                data-beeper="<?= $o['beeper_number'] ?>"
                                data-payment="<?= $o['payment_method'] ?>"
                                data-type="<?= $o['order_type'] ?>"
                                data-total="<?= $o['total'] ?>"
                                data-subtotal="<?= $o['subtotal'] ?>"
                                data-discount="<?= $o['discount'] ?>"
                                data-gcash-ref="<?= htmlspecialchars($o['gcash_reference'] ?? '') ?>"
                                data-items="<?= htmlspecialchars(json_encode($itemsJson), ENT_QUOTES) ?>"
                            >Edit</button>
                            <button class="void-order-btn"
                                data-id="<?= $o['id'] ?>"
                                data-label="<?= htmlspecialchars($orderLabel) ?>"
                                data-total="<?= $o['total'] ?>">Void</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="order-items">
                <?php for ($i = 0; $i < count($names); $i++): if (!$names[$i]) continue; ?>
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
                <?php if ($o['payment_method'] === 'gcash' && !empty($o['gcash_reference'])): ?>
                <div class="extra-row">
                    <span>Ref #</span>
                    <span><?= htmlspecialchars($o['gcash_reference']) ?></span>
                </div>
                <?php endif; ?>
                <div class="extra-row">
                    <span>Subtotal</span>
                    <span>Php <?= number_format($o['subtotal'], 0) ?></span>
                </div>
                <div class="extra-row">
                    <span>Discount</span>
                    <span><?= $o['discount'] > 0 ? '−Php '.number_format($o['discount'],0) : 'Php 0' ?></span>
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

<!-- EDIT MODAL -->
<div class="modal-overlay" id="editModal">
    <div class="edit-panel-modal">

        <div class="epm-header">
            <div>
                <h2>Edit Order</h2>
                <p>Modify customer order</p>
            </div>
            <button class="epm-close" id="editModalClose">×</button>
        </div>

        <div class="order-panel__type" id="epm-type-wrap">
            <button type="button" class="type-btn type-btn--active" data-type="dine-in">Dine in</button>
            <button type="button" class="type-btn" data-type="take-out">Take out</button>
        </div>
        <input type="hidden" id="epm-type">

        <div class="order-panel__beeper">
            <span class="beeper-label">Beeper #</span>
            <input type="number" id="epm-beeper" class="beeper-input" placeholder="Enter beeper number" min="1">
        </div>

        <p class="epm-items-label">ORDER ITEMS</p>
        <div class="epm-items-list" id="epm-items-list"></div>

        <button type="button" class="epm-add-btn" id="epm-add-btn">add order +</button>

        <div class="epm-menu-picker" id="epm-menu-picker">
            <div class="epm-picker-filters">
                <button class="epm-pf active" data-cat="all">All</button>
            </div>
            <div class="epm-picker-grid" id="epm-picker-grid"></div>
        </div>

        <div class="payment-summary">
            <p class="payment-summary__title">PAYMENT SUMMARY</p>
            <div class="payment-summary__row">
                <span class="discount-label">Discount</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="epm-discount-toggle">
                    <span class="toggle-slider"></span>
                </label>
                <span class="discount-value" id="epm-discount-val">Php 0</span>
            </div>
            <div class="payment-summary__row">
                <span>Subtotal</span>
                <span class="subtotal-value-normal" id="epm-subtotal-val">Php 0</span>
            </div>
            <div class="payment-summary__divider"></div>
            <div class="payment-summary__total">
                <span>Total</span>
                <span class="total-amount" id="epm-total-val">Php 0.00</span>
            </div>
        </div>

        <div class="payment-methods" id="epm-payment-wrap">
            <button type="button" class="payment-btn payment-btn--active" data-method="cash">Cash</button>
            <button type="button" class="payment-btn" data-method="gcash">Gcash</button>
        </div>
        <input type="hidden" id="epm-payment">

        <!-- Cash: amount paid -->
        <div class="amount-input-wrap" id="epm-amount-wrap">
            <input type="number" class="amount-input" id="epm-amount-input" placeholder="Amount Paid">
        </div>

        <!-- GCash: original ref (read-only display) + extra ref input -->
        <div id="epm-gcash-section" style="display:none;">
            <!-- Original reference (read-only) -->
            <div class="epm-gcash-orig" id="epm-gcash-orig-wrap">
                <div class="order-panel__beeper" style="opacity:.7;pointer-events:none;">
                    <span class="beeper-label" style="white-space:nowrap;">Original Ref #</span>
                    <input type="text" class="beeper-input" id="epm-gcash-orig" readonly placeholder="—">
                </div>
            </div>
        </div>

        <button type="button" class="place-order-btn" id="epm-total-btn" disabled>
            Place order – Php 0.00
        </button>

        <button type="button" class="epm-save-btn" id="epm-save-btn">Save Changes</button>

        <input type="hidden" id="epm-order-id">
    </div>
</div>

<!-- VOID MODAL -->
<div class="modal-overlay" id="voidModal">
    <div class="delete-box">
        <div class="void-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D8C36F" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
        </div>
        <h3>Void Order?</h3>
        <p id="voidModalMsg">This order will be marked as voided.</p>
        <div class="delete-actions">
            <button class="cancel-delete-btn" onclick="closeVoidModal()">Cancel</button>
            <button class="confirm-void-btn" id="confirmVoidBtn">Yes, Void it</button>
        </div>
    </div>
</div>

<script src="<?= $base_url ?>modules/orders/orders.js"></script>
</body>
</html>