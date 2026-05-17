<?php
// ── excel_report.php ─────────────────────────────────────────────────────
// Called via AJAX: index.php?page=statistics&excel_report=1
// Returns JSON with all sheets data.
// Place at: modules/statistics/excel_report.php
// ─────────────────────────────────────────────────────────────────────────

if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    http_response_code(403);
    exit('Forbidden');
}

session_start();
if (!isset($_SESSION['logged_in'])) {
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../db/connection.php';

$today      = date('Y-m-d');
$year       = (int)date('Y');
$month      = (int)date('m');

// ── SHEET 1: ORDERS (today) ───────────────────────────────────────────────
$orders_stmt = $pdo->prepare("
    SELECT
        o.id,
        o.beeper_number,
        o.order_type,
        o.payment_method,
        o.subtotal,
        o.discount,
        o.total,
        o.change_amount,
        o.status,
        o.created_at,
        o.served_at,
        GROUP_CONCAT(
            CONCAT(oi.quantity, 'x ', oi.name)
            ORDER BY oi.id
            SEPARATOR ', '
        ) AS items_str
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE DATE(o.created_at) = ?
      AND o.status IN ('pending','served','voided')
    GROUP BY o.id
    ORDER BY o.created_at ASC
");
$orders_stmt->execute([$today]);
$orders = $orders_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── SHEET 2: WEEKLY SUMMARY (current year) ────────────────────────────────
$weekly_stmt = $pdo->prepare("
    SELECT
        YEARWEEK(created_at, 1)              AS yw,
        MIN(DATE(created_at))                AS week_start,
        MAX(DATE(created_at))                AS week_end,
        COUNT(*)                             AS total_orders,
        COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
        COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
        COALESCE(SUM(total), 0)              AS total_sales,
        COALESCE(SUM(discount), 0)           AS total_discounts
    FROM orders
    WHERE YEAR(created_at) = ?
      AND status IN ('pending','served')
    GROUP BY YEARWEEK(created_at, 1)
    ORDER BY yw ASC
");
$weekly_stmt->execute([$year]);
$weekly = $weekly_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── SHEET 3: MONTHLY SUMMARY (current year) ───────────────────────────────
$monthly_stmt = $pdo->prepare("
    SELECT
        MONTH(created_at)                    AS mo,
        COUNT(*)                             AS total_orders,
        COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
        COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
        COALESCE(SUM(total), 0)              AS total_sales,
        COALESCE(SUM(discount), 0)           AS total_discounts,
        COALESCE(AVG(total), 0)              AS avg_order
    FROM orders
    WHERE YEAR(created_at) = ?
      AND status IN ('pending','served')
    GROUP BY MONTH(created_at)
    ORDER BY mo ASC
");
$monthly_stmt->execute([$year]);
$monthly = $monthly_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── SHEET 4: ANNUAL SUMMARY (all years in DB) ─────────────────────────────
$annual_stmt = $pdo->query("
    SELECT
        YEAR(created_at)                     AS yr,
        COUNT(*)                             AS total_orders,
        COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
        COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
        COALESCE(SUM(total), 0)              AS total_sales,
        COALESCE(SUM(discount), 0)           AS total_discounts
    FROM orders
    WHERE status IN ('pending','served')
    GROUP BY YEAR(created_at)
    ORDER BY yr ASC
");
$annual = $annual_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── SHEET 5: TOP ITEMS (current month) ────────────────────────────────────
$top_stmt = $pdo->prepare("
    SELECT
        oi.name,
        SUM(oi.quantity)                        AS total_qty,
        COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
      AND o.status IN ('pending','served')
    GROUP BY oi.name
    ORDER BY total_qty DESC
");
$top_stmt->execute([$year, $month]);
$top_items = $top_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── OUTPUT ────────────────────────────────────────────────────────────────
echo json_encode([
    'today'      => $today,
    'year'       => $year,
    'month'      => $month,
    'orders'     => $orders,
    'weekly'     => $weekly,
    'monthly'    => $monthly,
    'annual'     => $annual,
    'top_items'  => $top_items,
]);