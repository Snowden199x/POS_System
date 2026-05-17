<?php
// ── AJAX HANDLERS (must be before session/HTML output) ─────────────────────
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
    if (!isset($_SESSION["logged_in"])) { echo json_encode([]); exit(); }

    require_once __DIR__ . '/../../db/connection.php';

    // ── LIVE ORDERS ────────────────────────────────────────────────────────
    if (isset($_GET['live_orders'])) {
        $stmt = $pdo->query("
            SELECT
                o.id,
                o.beeper_number,
                o.created_at,
                o.order_type,
                o.payment_method,
                o.total,
                o.status,
                GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name, '|', oi.price) SEPARATOR ';;') AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status IN ('pending', 'served')
              AND DATE(o.created_at) = CURDATE()
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 30
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit();
    }

    // ── EXCEL DATA ─────────────────────────────────────────────────────────
    if (isset($_GET['excel_data'])) {
        $type = $_GET['excel_data'];
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

        if ($type === 'orders') {
            $stmt = $pdo->prepare("
                SELECT
                    o.id, o.beeper_number, o.created_at, o.order_type,
                    o.payment_method, o.subtotal, o.discount, o.total, o.status,
                    GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name) SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE YEAR(o.created_at) = ? AND o.status IN ('pending','served','voided')
                GROUP BY o.id
                ORDER BY o.created_at DESC
            ");
            $stmt->execute([$year]);
            echo json_encode(['orders' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } elseif ($type === 'weekly') {
            $stmt = $pdo->prepare("
                SELECT
                    YEARWEEK(created_at,1) as yw,
                    MIN(DATE(created_at)) as week_start,
                    MAX(DATE(created_at)) as week_end,
                    COUNT(*) as order_count,
                    COALESCE(SUM(total),0) as total_sales
                FROM orders
                WHERE YEAR(created_at) = ? AND status IN ('pending','served')
                GROUP BY YEARWEEK(created_at,1)
                ORDER BY yw ASC
            ");
            $stmt->execute([$year]);
            echo json_encode(['weekly' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } elseif ($type === 'monthly') {
            $stmt = $pdo->prepare("
                SELECT
                    MONTH(created_at) as mo,
                    COUNT(*) as order_count,
                    COALESCE(SUM(total),0) as total_sales
                FROM orders
                WHERE YEAR(created_at) = ? AND status IN ('pending','served')
                GROUP BY MONTH(created_at)
                ORDER BY mo ASC
            ");
            $stmt->execute([$year]);
            echo json_encode(['monthly' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } elseif ($type === 'annual') {
            // Month summary
            $stmt = $pdo->prepare("
                SELECT
                    MONTH(created_at) as mo,
                    COUNT(*) as orders,
                    COUNT(CASE WHEN status='served' THEN 1 END) as served,
                    COALESCE(SUM(total),0) as total
                FROM orders
                WHERE YEAR(created_at) = ? AND status IN ('pending','served')
                GROUP BY MONTH(created_at)
                ORDER BY mo
            ");
            $stmt->execute([$year]);
            $months = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Voids per month
            $vstmt = $pdo->prepare("
                SELECT MONTH(created_at) as mo, COUNT(*) as voids
                FROM orders
                WHERE YEAR(created_at) = ? AND status='voided'
                GROUP BY MONTH(created_at)
            ");
            $vstmt->execute([$year]);
            $voids_map = [];
            foreach ($vstmt->fetchAll(PDO::FETCH_ASSOC) as $v) $voids_map[$v['mo']] = $v['voids'];
            foreach ($months as &$m) $m['voids'] = $voids_map[$m['mo']] ?? 0;
            unset($m);

            // Orders grouped by month for detail sheets
            $ostmt = $pdo->prepare("
                SELECT
                    MONTH(o.created_at) as mo,
                    o.id, o.beeper_number, o.created_at, o.order_type,
                    o.payment_method, o.total, o.status
                FROM orders o
                WHERE YEAR(o.created_at) = ? AND o.status IN ('pending','served')
                ORDER BY o.created_at ASC
            ");
            $ostmt->execute([$year]);
            $orders_by_month = [];
            foreach ($ostmt->fetchAll(PDO::FETCH_ASSOC) as $o) {
                $orders_by_month[$o['mo']][] = $o;
            }

            echo json_encode(['months' => $months, 'orders_by_month' => $orders_by_month]);
        } else {
            echo json_encode([]);
        }
        exit();
    }
        // ── EXCEL REPORT (ALL SHEETS) ──────────────────────────────────────────
        if (isset($_GET['excel_report'])) {
            $today = date('Y-m-d');
            $year  = (int)date('Y');
            $month = (int)date('m');

            // Orders - today
            $s = $pdo->prepare("SELECT o.id, o.beeper_number, o.order_type, o.payment_method, o.subtotal, o.discount, o.total, o.change_amount, o.status, o.created_at, o.served_at, GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ? AND o.status IN ('pending','served','voided') GROUP BY o.id ORDER BY o.created_at ASC");
            $s->execute([$year, $month]);
            $orders = $s->fetchAll(PDO::FETCH_ASSOC);

            // Weekly - current year
            $s = $pdo->prepare("SELECT YEARWEEK(created_at,1) AS yw, MIN(DATE(created_at)) AS week_start, MAX(DATE(created_at)) AS week_end, COUNT(*) AS total_orders, COUNT(CASE WHEN status='served' THEN 1 END) AS served, COUNT(CASE WHEN status='pending' THEN 1 END) AS pending, COUNT(CASE WHEN status='voided' THEN 1 END) AS voided, COALESCE(SUM(total),0) AS total_sales, COALESCE(SUM(discount),0) AS total_discounts FROM orders WHERE YEAR(created_at)=? AND status IN ('pending','served') GROUP BY YEARWEEK(created_at,1) ORDER BY yw ASC");
            $s->execute([$year]);
            $weekly = $s->fetchAll(PDO::FETCH_ASSOC);

            // Monthly - current year
            $s = $pdo->prepare("SELECT MONTH(created_at) AS mo, COUNT(*) AS total_orders, COUNT(CASE WHEN status='served' THEN 1 END) AS served, COUNT(CASE WHEN status='pending' THEN 1 END) AS pending, COUNT(CASE WHEN status='voided' THEN 1 END) AS voided, COALESCE(SUM(total),0) AS total_sales, COALESCE(SUM(discount),0) AS total_discounts, COALESCE(AVG(total),0) AS avg_order FROM orders WHERE YEAR(created_at)=? AND status IN ('pending','served') GROUP BY MONTH(created_at) ORDER BY mo ASC");
            $s->execute([$year]);
            $monthly = $s->fetchAll(PDO::FETCH_ASSOC);

            // Annual - all years
            $s = $pdo->query("SELECT YEAR(created_at) AS yr, COUNT(*) AS total_orders, COUNT(CASE WHEN status='served' THEN 1 END) AS served, COUNT(CASE WHEN status='pending' THEN 1 END) AS pending, COUNT(CASE WHEN status='voided' THEN 1 END) AS voided, COALESCE(SUM(total),0) AS total_sales, COALESCE(SUM(discount),0) AS total_discounts FROM orders WHERE status IN ('pending','served') GROUP BY YEAR(created_at) ORDER BY yr ASC");
            $annual = $s->fetchAll(PDO::FETCH_ASSOC);

            // Top Items - current month
            $s = $pdo->prepare("SELECT oi.name, SUM(oi.quantity) AS total_qty, COALESCE(SUM(oi.quantity * oi.price),0) AS total_revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE YEAR(o.created_at)=? AND MONTH(o.created_at)=? AND o.status IN ('pending','served') GROUP BY oi.name ORDER BY total_qty DESC");
            $s->execute([$year, $month]);
            $top_items = $s->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'today' => $today, 'year' => $year, 'month' => $month,
                'orders' => $orders, 'weekly' => $weekly,
                'monthly' => $monthly, 'annual' => $annual,
                'top_items' => $top_items,
            ]);
            exit();
        }
    exit();
}
// ── END AJAX ────────────────────────────────────────────────────────────────