<?php
// ── Must run before any session usage ──────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) session_start();

// ── Only handle AJAX requests here ─────────────────────────────────────────
if (
    isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
) {
    if (!isset($_SESSION["logged_in"])) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit();
    }

    // db/connection.php may already be included by statistics.php when
    // it require_once's this file — guard against double-include
    if (!isset($pdo)) {
        require_once __DIR__ . '/../../db/connection.php';
    }

    header('Content-Type: application/json');

    // ── LIVE ORDERS ──────────────────────────────────────────────────────
    if (isset($_GET['live_orders'])) {
        $stmt = $pdo->query("
            SELECT o.id, o.beeper_number, o.created_at, o.order_type,
                   o.payment_method, o.gcash_reference, o.total, o.status,
                   GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name,'|',oi.price) SEPARATOR ';;') AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status IN ('pending','served') AND DATE(o.created_at) = CURDATE()
            GROUP BY o.id ORDER BY o.created_at DESC LIMIT 30
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit();
    }

    // ── EXCEL REPORT ────────────────────────────────────────────────────
    if (isset($_GET['excel_report'])) {
        $year        = isset($_GET['year'])         ? (int)$_GET['year']         : (int)date('Y');
        $month       = isset($_GET['month'])        ? (int)$_GET['month']        : (int)date('m');
        $filterMonth = isset($_GET['filter_month']) ? (int)$_GET['filter_month'] : 0; // 0 = all months

        // ── Orders ────────────────────────────────────────────────────────
        if ($filterMonth > 0) {
            $s = $pdo->prepare("
                SELECT o.id, o.beeper_number, o.order_type, o.payment_method,
                       o.gcash_reference, o.gcash_reference_extra, o.gcash_extra_amount,
                       o.subtotal, o.discount, o.refund_amount, o.total, o.change_amount,
                       o.status, o.created_at, o.served_at,
                       GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
                  AND o.status IN ('pending','served','voided')
                GROUP BY o.id ORDER BY o.created_at ASC
            ");
            $s->execute([$year, $filterMonth]);
        } else {
            $s = $pdo->prepare("
                SELECT o.id, o.beeper_number, o.order_type, o.payment_method,
                       o.gcash_reference, o.gcash_reference_extra, o.gcash_extra_amount,
                       o.subtotal, o.discount, o.refund_amount, o.total, o.change_amount,
                       o.status, o.created_at, o.served_at,
                       GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE YEAR(o.created_at) = ?
                  AND o.status IN ('pending','served','voided')
                GROUP BY o.id ORDER BY o.created_at ASC
            ");
            $s->execute([$year]);
        }
        $orders = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Daily — all days in the month ────────────────────────────────
        $dailyMonth  = $filterMonth > 0 ? $filterMonth : ($month > 0 ? $month : (int)date('m'));

if ($filterMonth > 0) {
    // ── Single month: fetch only that month ───────────────────────────
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $dailyMonth, $year);

    $s = $pdo->prepare("
        SELECT DATE(created_at) AS d,
               COUNT(*) AS total_orders,
               COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
               COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
               COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
               COALESCE(SUM(total),0)    AS total_sales,
               COALESCE(SUM(discount),0) AS total_discounts
        FROM orders
        WHERE YEAR(created_at)=? AND MONTH(created_at)=?
          AND status IN ('pending','served','voided')
        GROUP BY DATE(created_at) ORDER BY d ASC
    ");
    $s->execute([$year, $dailyMonth]);
    $daily_raw     = $s->fetchAll(PDO::FETCH_ASSOC);
    $daily_by_date = [];
    foreach ($daily_raw as $r) $daily_by_date[$r['d']] = $r;

    $daily = [];
    for ($d = 1; $d <= $daysInMonth; $d++) {
        $key     = sprintf('%04d-%02d-%02d', $year, $dailyMonth, $d);
        $daily[] = $daily_by_date[$key] ?? [
            'd'=>$key,'total_orders'=>0,'served'=>0,
            'pending'=>0,'voided'=>0,'total_sales'=>0,'total_discounts'=>0,
        ];
    }
} else {
    // ── All months: fetch every day in the whole year ─────────────────
            $s = $pdo->prepare("
                SELECT DATE(created_at) AS d,
                    COUNT(*) AS total_orders,
                    COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                    COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                    COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                    COALESCE(SUM(total),0)    AS total_sales,
                    COALESCE(SUM(discount),0) AS total_discounts
                FROM orders
                WHERE YEAR(created_at)=?
                AND status IN ('pending','served','voided')
                GROUP BY DATE(created_at) ORDER BY d ASC
            ");
            $s->execute([$year]);
            $daily_raw     = $s->fetchAll(PDO::FETCH_ASSOC);
            $daily_by_date = [];
            foreach ($daily_raw as $r) $daily_by_date[$r['d']] = $r;

            // Loop every day of every month in the year
            $daily = [];
            for ($mo = 1; $mo <= 12; $mo++) {
                $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $mo, $year);
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $key     = sprintf('%04d-%02d-%02d', $year, $mo, $d);
                    $daily[] = $daily_by_date[$key] ?? [
                        'd'=>$key,'total_orders'=>0,'served'=>0,
                        'pending'=>0,'voided'=>0,'total_sales'=>0,'total_discounts'=>0,
                    ];
                }
            }
        }

        // ── Weekly ────────────────────────────────────────────────────────
        $wWhere  = "YEAR(created_at)=?";
        $wParams = [$year];
        if ($filterMonth > 0) { $wWhere .= " AND MONTH(created_at)=?"; $wParams[] = $filterMonth; }
        $s = $pdo->prepare("
            SELECT YEARWEEK(created_at,1) AS yw,
                   MIN(DATE(created_at)) AS week_start, MAX(DATE(created_at)) AS week_end,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0)    AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts
            FROM orders WHERE $wWhere AND status IN ('pending','served')
            GROUP BY YEARWEEK(created_at,1) ORDER BY yw ASC
        ");
        $s->execute($wParams);
        $weekly = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Monthly — always all 12 months ────────────────────────────────
        $s = $pdo->prepare("
            SELECT MONTH(created_at) AS mo,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0)    AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts,
                   COALESCE(AVG(total),0)    AS avg_order
            FROM orders WHERE YEAR(created_at)=? AND status IN ('pending','served')
            GROUP BY MONTH(created_at) ORDER BY mo
        ");
        $s->execute([$year]);
        $monthly_raw   = $s->fetchAll(PDO::FETCH_ASSOC);
        $monthly_by_mo = [];
        foreach ($monthly_raw as $r) $monthly_by_mo[(int)$r['mo']] = $r;
        $monthly = [];
        for ($mo = 1; $mo <= 12; $mo++) {
            $monthly[] = $monthly_by_mo[$mo] ?? [
                'mo'=>$mo,'total_orders'=>0,'served'=>0,'pending'=>0,
                'voided'=>0,'total_sales'=>0,'total_discounts'=>0,'avg_order'=>0,
            ];
        }

        // ── Annual ────────────────────────────────────────────────────────
        $s = $pdo->query("
            SELECT YEAR(created_at) AS yr,
                   COUNT(*) AS total_orders,
                   COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                   COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                   COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                   COALESCE(SUM(total),0)    AS total_sales,
                   COALESCE(SUM(discount),0) AS total_discounts
            FROM orders WHERE status IN ('pending','served')
            GROUP BY YEAR(created_at) ORDER BY yr ASC
        ");
        $annual = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Top items ─────────────────────────────────────────────────────
        $s = $pdo->prepare("
            SELECT oi.name,
                   SUM(oi.quantity)                        AS total_qty,
                   COALESCE(SUM(oi.quantity*oi.price),0)   AS total_revenue
            FROM order_items oi JOIN orders o ON o.id=oi.order_id
            WHERE YEAR(o.created_at)=? AND MONTH(o.created_at)=?
              AND o.status IN ('pending','served')
            GROUP BY oi.name ORDER BY total_qty DESC
        ");
        $s->execute([$year, $dailyMonth]);
        $top_items = $s->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'year'        => $year,
            'month'       => $month,
            'filter_month'=> $filterMonth,
            'daily_month' => $dailyMonth,
            'orders'      => $orders,
            'daily'       => $daily,
            'weekly'      => $weekly,
            'monthly'     => $monthly,
            'annual'      => $annual,
            'top_items'   => $top_items,
        ]);
        exit();
    }

    echo json_encode([]);
    exit();
}
// ── End AJAX block — normal page request falls through ─────────────────────