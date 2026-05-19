<?php
// ── AJAX HANDLERS ───────────────────────────────────────────────────────────
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
    if (!isset($_SESSION["logged_in"])) { echo json_encode([]); exit(); }

    require_once __DIR__ . '/../../db/connection.php';

    // ── LIVE ORDERS ────────────────────────────────────────────────────────
    if (isset($_GET['live_orders'])) {
        $stmt = $pdo->query("
            SELECT o.id, o.beeper_number, o.created_at, o.order_type,
                   o.payment_method, o.gcash_reference, o.total, o.status,
                   GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name, '|', oi.price) SEPARATOR ';;') AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status IN ('pending','served') AND DATE(o.created_at) = CURDATE()
            GROUP BY o.id ORDER BY o.created_at DESC LIMIT 30
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit();
    }

    // ── EXCEL REPORT (ALL SHEETS) ──────────────────────────────────────────
    if (isset($_GET['excel_report'])) {
        $year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

        // Orders for selected year
        $s = $pdo->prepare("
            SELECT o.id, o.beeper_number, o.order_type, o.payment_method,
                   o.gcash_reference, o.subtotal, o.discount, o.total,
                   o.change_amount, o.status, o.created_at, o.served_at,
                   GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE YEAR(o.created_at) = ?
              AND o.status IN ('pending','served','voided')
            GROUP BY o.id ORDER BY o.created_at ASC
        ");
        $s->execute([$year]);
        $orders = $s->fetchAll(PDO::FETCH_ASSOC);

        // Weekly for selected year
        $s = $pdo->prepare("
            SELECT YEARWEEK(created_at,1) AS yw,
                   MIN(DATE(created_at)) AS week_start, MAX(DATE(created_at)) AS week_end,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0) AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts
            FROM orders
            WHERE YEAR(created_at) = ? AND status IN ('pending','served')
            GROUP BY YEARWEEK(created_at,1) ORDER BY yw ASC
        ");
        $s->execute([$year]);
        $weekly = $s->fetchAll(PDO::FETCH_ASSOC);

        // Monthly — build all 12 months, fill zeros for empty ones
        $s = $pdo->prepare("
            SELECT MONTH(created_at) AS mo,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0) AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts,
                   COALESCE(AVG(total),0) AS avg_order
            FROM orders
            WHERE YEAR(created_at) = ? AND status IN ('pending','served')
            GROUP BY MONTH(created_at) ORDER BY mo ASC
        ");
        $s->execute([$year]);
        $monthly_raw = $s->fetchAll(PDO::FETCH_ASSOC);

        // Fill all 12 months with zeros
        $monthly_by_mo = [];
        foreach ($monthly_raw as $r) $monthly_by_mo[(int)$r['mo']] = $r;
        $monthly = [];
        for ($mo = 1; $mo <= 12; $mo++) {
            $monthly[] = $monthly_by_mo[$mo] ?? [
                'mo' => $mo, 'total_orders' => 0, 'served' => 0, 'pending' => 0,
                'voided' => 0, 'total_sales' => 0, 'total_discounts' => 0, 'avg_order' => 0,
            ];
        }

        // Annual — all years
        $s = $pdo->query("
            SELECT YEAR(created_at) AS yr,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0) AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts
            FROM orders WHERE status IN ('pending','served')
            GROUP BY YEAR(created_at) ORDER BY yr ASC
        ");
        $annual = $s->fetchAll(PDO::FETCH_ASSOC);

        // Top items for selected month
        $s = $pdo->prepare("
            SELECT oi.name, SUM(oi.quantity) AS total_qty,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS total_revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
              AND o.status IN ('pending','served')
            GROUP BY oi.name ORDER BY total_qty DESC
        ");
        $s->execute([$year, $month]);
        $top_items = $s->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'year' => $year, 'month' => $month,
            'orders' => $orders, 'weekly' => $weekly,
            'monthly' => $monthly, 'annual' => $annual,
            'top_items' => $top_items,
        ]);
        exit();
    }

    // ── LEGACY excel_data handler (kept for compatibility) ─────────────────
    if (isset($_GET['excel_data'])) {
        $type = $_GET['excel_data'];
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

        if ($type === 'orders') {
            $s = $pdo->prepare("
                SELECT o.id, o.beeper_number, o.created_at, o.order_type,
                       o.payment_method, o.gcash_reference, o.subtotal, o.discount,
                       o.total, o.status,
                       GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name) SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE YEAR(o.created_at) = ? AND o.status IN ('pending','served','voided')
                GROUP BY o.id ORDER BY o.created_at DESC
            ");
            $s->execute([$year]);
            echo json_encode(['orders' => $s->fetchAll(PDO::FETCH_ASSOC)]);
        } elseif ($type === 'monthly') {
            $s = $pdo->prepare("
                SELECT MONTH(created_at) AS mo, COUNT(*) AS order_count,
                       COALESCE(SUM(total),0) AS total_sales
                FROM orders WHERE YEAR(created_at)=? AND status IN ('pending','served')
                GROUP BY MONTH(created_at) ORDER BY mo ASC
            ");
            $s->execute([$year]);
            $raw = $s->fetchAll(PDO::FETCH_ASSOC);
            $by_mo = [];
            foreach ($raw as $r) $by_mo[(int)$r['mo']] = $r;
            $monthly = [];
            for ($mo = 1; $mo <= 12; $mo++) {
                $monthly[] = $by_mo[$mo] ?? ['mo' => $mo, 'order_count' => 0, 'total_sales' => 0];
            }
            echo json_encode(['monthly' => $monthly]);
        } else {
            echo json_encode([]);
        }
        exit();
    }

    exit();
}
// ── END AJAX ────────────────────────────────────────────────────────────────