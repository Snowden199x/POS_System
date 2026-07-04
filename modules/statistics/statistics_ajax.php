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

    if (!isset($pdo)) {
        require_once __DIR__ . '/../../db/connection.php';
    }

    header('Content-Type: application/json');

    // ══════════════════════════════════════════════════════════════════════
    //  BUSINESS DAY HELPERS  (5 PM – 2 AM)
    // ══════════════════════════════════════════════════════════════════════
    $BIZ_DATE  = "DATE(CONVERT_TZ(created_at,'+00:00','+08:00') - INTERVAL 17 HOUR)";
    $BIZ_YEAR  = "YEAR(CONVERT_TZ(created_at,'+00:00','+08:00') - INTERVAL 17 HOUR)";
    $BIZ_MONTH = "MONTH(CONVERT_TZ(created_at,'+00:00','+08:00') - INTERVAL 17 HOUR)";

    // ── Branch / merge ────────────────────────────────────────────────────
    $branch_id = (int)($_SESSION['user_id'] ?? 1);
    $merge     = isset($_GET['merge']) && $_GET['merge'] === '1';

    // ── EXCEL REPORT ────────────────────────────────────────────────────
    if (isset($_GET['excel_report'])) {
        $year        = isset($_GET['year'])         ? (int)$_GET['year']         : (int)date('Y');
        $month       = isset($_GET['month'])        ? (int)$_GET['month']        : (int)date('m');
        $filterMonth = isset($_GET['filter_month']) ? (int)$_GET['filter_month'] : 0;

        // ── Orders ────────────────────────────────────────────────────────
        // Fetch branch names for merge mode
        $branch_names = [];
        if ($merge) {
            $bn_stmt = $pdo->query("SELECT id, branch_name FROM users ORDER BY id");
            foreach ($bn_stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $branch_names[$row['id']] = $row['branch_name'];
            }
        } else {
            $bn_stmt = $pdo->prepare("SELECT branch_name FROM users WHERE id = ?");
            $bn_stmt->execute([$branch_id]);
            $bn_row = $bn_stmt->fetch(PDO::FETCH_ASSOC);
            $branch_names[$branch_id] = $bn_row['branch_name'] ?? 'Branch';
        }

        // Build branch WHERE clause
        if ($merge) {
            $branch_where     = "1=1";
            $branch_where_o   = "1=1";
            $branch_params    = [];
        } else {
            $branch_where     = "branch_id = $branch_id";
            $branch_where_o   = "o.branch_id = $branch_id";
            $branch_params    = [];
        }

        if ($filterMonth > 0) {
            $s = $pdo->prepare("
                SELECT o.id, o.branch_id, o.beeper_number, o.order_type, o.payment_method,
                       o.gcash_reference, o.gcash_reference_extra, o.gcash_extra_amount,
                       o.subtotal, o.discount, o.refund_amount, o.total, o.change_amount,
                       o.status, o.created_at, o.served_at,
                       GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE $BIZ_YEAR = ? AND $BIZ_MONTH = ?
                AND o.status IN ('served','voided')
                AND $branch_where_o
                GROUP BY o.id ORDER BY o.created_at ASC
            ");
            $s->execute([$year, $filterMonth]);
        } else {
            $s = $pdo->prepare("
                SELECT o.id, o.branch_id, o.beeper_number, o.order_type, o.payment_method,
                       o.gcash_reference, o.gcash_reference_extra, o.gcash_extra_amount,
                       o.subtotal, o.discount, o.refund_amount, o.total, o.change_amount,
                       o.status, o.created_at, o.served_at,
                       GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE $BIZ_YEAR = ?
                  AND o.status IN ('served','voided')
                  AND $branch_where_o
                GROUP BY o.id ORDER BY o.created_at ASC
            ");
            $s->execute([$year]);
        }
        $orders = $s->fetchAll(PDO::FETCH_ASSOC);

        // Tag each order with branch name for merge mode
        foreach ($orders as &$o) {
            $o['branch_name'] = $branch_names[$o['branch_id']] ?? 'Branch '.$o['branch_id'];
        }
        unset($o);

        // ── Daily summary ────────────────────────────────────────────────
        // dailyMonth: used for sheet titles. 0 = all months, >0 = specific month
        $dailyMonth = $filterMonth; // 0 means all months

        if ($filterMonth > 0) {
            $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $dailyMonth, $year);
            $s = $pdo->prepare("
                SELECT
                    $BIZ_DATE AS d,
                    COUNT(*) AS total_orders,
                    COUNT(CASE WHEN status='served' THEN 1 END) AS served,
                    COUNT(CASE WHEN status='voided' THEN 1 END) AS voided,
                    COALESCE(SUM(CASE WHEN status='served' THEN total    ELSE 0 END),0) AS total_sales,
                    COALESCE(SUM(CASE WHEN status='served' THEN discount ELSE 0 END),0) AS total_discounts
                FROM orders
                WHERE $BIZ_YEAR=? AND $BIZ_MONTH=?
                AND status IN ('served','voided')
                AND $branch_where
                GROUP BY $BIZ_DATE ORDER BY d ASC
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
                    'voided'=>0,'total_sales'=>0,'total_discounts'=>0,
                ];
            }
        } else {
            $s = $pdo->prepare("
                SELECT
                    $BIZ_DATE AS d,
                    COUNT(*) AS total_orders,
                    COUNT(CASE WHEN status='served' THEN 1 END) AS served,
                    COUNT(CASE WHEN status='voided' THEN 1 END) AS voided,
                    COALESCE(SUM(CASE WHEN status='served' THEN total    ELSE 0 END),0) AS total_sales,
                    COALESCE(SUM(CASE WHEN status='served' THEN discount ELSE 0 END),0) AS total_discounts
                FROM orders
                WHERE $BIZ_YEAR=?
                AND status IN ('served','voided')
                AND $branch_where
                GROUP BY $BIZ_DATE ORDER BY d ASC
            ");
            $s->execute([$year]);
            $daily_raw     = $s->fetchAll(PDO::FETCH_ASSOC);
            $daily_by_date = [];
            foreach ($daily_raw as $r) $daily_by_date[$r['d']] = $r;

            $daily = [];
            for ($mo = 1; $mo <= 12; $mo++) {
                $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $mo, $year);
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $key     = sprintf('%04d-%02d-%02d', $year, $mo, $d);
                    $daily[] = $daily_by_date[$key] ?? [
                        'd'=>$key,'total_orders'=>0,'served'=>0,
                        'voided'=>0,'total_sales'=>0,'total_discounts'=>0,
                    ];
                }
            }
        }

        // ── Weekly ────────────────────────────────────────────────────────
        $wWhere  = "$BIZ_YEAR=? AND $branch_where";
        $wParams = [$year];
        if ($filterMonth > 0) {
            $wWhere   .= " AND $BIZ_MONTH=?";
            $wParams[] = $filterMonth;
        }
        $s = $pdo->prepare("
            SELECT
                YEARWEEK(CONVERT_TZ(created_at,'+00:00','+08:00') - INTERVAL 17 HOUR, 1) AS yw,
                MIN($BIZ_DATE) AS week_start,
                MAX($BIZ_DATE) AS week_end,
                COUNT(*) AS total_orders,
                COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                COALESCE(SUM(CASE WHEN status='served' THEN total    ELSE 0 END),0) AS total_sales,
                COALESCE(SUM(CASE WHEN status='served' THEN discount ELSE 0 END),0) AS total_discounts
            FROM orders
            WHERE $wWhere AND status IN ('served','voided')
            GROUP BY YEARWEEK(CONVERT_TZ(created_at,'+00:00','+08:00') - INTERVAL 17 HOUR, 1)
            ORDER BY yw ASC
        ");
        $s->execute($wParams);
        $weekly = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Monthly ────────────────────────────────────────────────────────
        $s = $pdo->prepare("
            SELECT
                $BIZ_MONTH AS mo,
                COUNT(*) AS total_orders,
                COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                COALESCE(SUM(CASE WHEN status='served' THEN total    ELSE 0 END),0) AS total_sales,
                COALESCE(SUM(CASE WHEN status='served' THEN discount ELSE 0 END),0) AS total_discounts,
                COALESCE(AVG(CASE WHEN status='served' THEN total ELSE NULL END),0) AS avg_order
            FROM orders
            WHERE $BIZ_YEAR=? AND $branch_where AND status IN ('served','voided')
            GROUP BY $BIZ_MONTH ORDER BY mo
        ");
        $s->execute([$year]);
        $monthly_raw   = $s->fetchAll(PDO::FETCH_ASSOC);
        $monthly_by_mo = [];
        foreach ($monthly_raw as $r) $monthly_by_mo[(int)$r['mo']] = $r;
        $monthly = [];
        for ($mo = 1; $mo <= 12; $mo++) {
            $monthly[] = $monthly_by_mo[$mo] ?? [
                'mo'=>$mo,'total_orders'=>0,'served'=>0,
                'voided'=>0,'total_sales'=>0,'total_discounts'=>0,'avg_order'=>0,
            ];
        }

        // ── Annual ────────────────────────────────────────────────────────
        $s = $pdo->prepare("
            SELECT
                $BIZ_YEAR AS yr,
                COUNT(*) AS total_orders,
                COUNT(CASE WHEN status='served'  THEN 1 END) AS served,
                COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,
                COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided,
                COALESCE(SUM(CASE WHEN status='served' THEN total    ELSE 0 END),0) AS total_sales,
                COALESCE(SUM(CASE WHEN status='served' THEN discount ELSE 0 END),0) AS total_discounts
            FROM orders
            WHERE $branch_where AND status IN ('served','voided')
            GROUP BY $BIZ_YEAR ORDER BY yr ASC
        ");
        $s->execute();
        $annual = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Top items — respects filterMonth (0 = all months) ───────────────
        if ($filterMonth > 0) {
            // Specific month selected
            $s = $pdo->prepare("
                SELECT oi.name,
                       SUM(oi.quantity)                        AS total_qty,
                       COALESCE(SUM(oi.quantity*oi.price),0)   AS total_revenue
                FROM order_items oi JOIN orders o ON o.id=oi.order_id
                WHERE $BIZ_YEAR=? AND $BIZ_MONTH=?
                  AND o.status IN ('served')
                  AND $branch_where_o
                GROUP BY oi.name ORDER BY total_qty DESC
            ");
            $s->execute([$year, $filterMonth]);
        } else {
            // All months — no month filter
            $s = $pdo->prepare("
                SELECT oi.name,
                       SUM(oi.quantity)                        AS total_qty,
                       COALESCE(SUM(oi.quantity*oi.price),0)   AS total_revenue
                FROM order_items oi JOIN orders o ON o.id=oi.order_id
                WHERE $BIZ_YEAR=?
                  AND o.status IN ('served')
                  AND $branch_where_o
                GROUP BY oi.name ORDER BY total_qty DESC
            ");
            $s->execute([$year]);
        }
        $top_items = $s->fetchAll(PDO::FETCH_ASSOC);

        // ── Per-branch data for merge mode ────────────────────────────────
        $branches_data = [];
        if ($merge) {
            // Fetch all branch ids
            $all_branches = $pdo->query("SELECT id, branch_name FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($all_branches as $branch) {
                $bid  = $branch['id'];
                $bname = $branch['branch_name'];

                // Orders per branch
                if ($filterMonth > 0) {
                    $bs = $pdo->prepare("
                        SELECT o.id, o.beeper_number, o.order_type, o.payment_method,
                               o.subtotal, o.discount, o.total, o.status, o.created_at, o.served_at,
                               GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                        FROM orders o
                        LEFT JOIN order_items oi ON oi.order_id = o.id
                        WHERE $BIZ_YEAR=? AND $BIZ_MONTH=? AND o.status IN ('served','voided') AND o.branch_id=?
                        GROUP BY o.id ORDER BY o.created_at ASC
                    ");
                    $bs->execute([$year, $filterMonth, $bid]);
                } else {
                    $bs = $pdo->prepare("
                        SELECT o.id, o.beeper_number, o.order_type, o.payment_method,
                               o.subtotal, o.discount, o.total, o.status, o.created_at, o.served_at,
                               GROUP_CONCAT(CONCAT(oi.quantity,'x ',oi.name) ORDER BY oi.id SEPARATOR ', ') AS items_str
                        FROM orders o
                        LEFT JOIN order_items oi ON oi.order_id = o.id
                        WHERE $BIZ_YEAR=? AND o.status IN ('served','voided') AND o.branch_id=?
                        GROUP BY o.id ORDER BY o.created_at ASC
                    ");
                    $bs->execute([$year, $bid]);
                }
                $branches_data[] = [
                    'branch_id'   => $bid,
                    'branch_name' => $bname,
                    'orders'      => $bs->fetchAll(PDO::FETCH_ASSOC),
                ];
            }
        }

        echo json_encode([
            'year'          => $year,
            'month'         => $month,
            'filter_month'  => $filterMonth,
            'daily_month'   => $dailyMonth,
            'merged'        => $merge,
            'branch_names'  => array_values($branch_names),
            'orders'        => $orders,
            'branches_data' => $branches_data,
            'daily'         => $daily,
            'weekly'        => $weekly,
            'monthly'       => $monthly,
            'annual'        => $annual,
            'top_items'     => $top_items,
        ]);
        exit();
    }

    echo json_encode([]);
    exit();
}
// ── End AJAX block ─────────────────────────────────────────────────────────