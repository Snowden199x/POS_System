<?php
session_start();
if (!isset($_SESSION["logged_in"])) {
    http_response_code(403);
    echo "<p style='font-family:Poppins,sans-serif;color:#c00;text-align:center;margin-top:80px;'>Access denied. Please log in first.</p>";
    exit();
}

require_once __DIR__ . '/../../db/connection.php';
date_default_timezone_set('Asia/Manila');
// ── DATE PARAMS ────────────────────────────────────────────────────────
$year  = isset($_GET['year'])  ? (int)$_GET['year']  : (int)date('Y');
$month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

$months_list = [
    1=>'January',2=>'February',3=>'March',4=>'April',
    5=>'May',6=>'June',7=>'July',8=>'August',
    9=>'September',10=>'October',11=>'November',12=>'December'
];
$year_range = range(2026, 2036);

// ── MONTHLY STATS ──────────────────────────────────────────────────────
$monthly_stmt = $pdo->prepare("
    SELECT
        COALESCE(SUM(total), 0)                      AS total_sales,
        COUNT(*)                                     AS total_orders,
        COALESCE(AVG(total), 0)                      AS avg_order,
        COALESCE(SUM(discount), 0)                   AS total_discounts,
        COUNT(CASE WHEN status='served'  THEN 1 END) AS served_count,
        COUNT(CASE WHEN status='pending' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN status='voided'  THEN 1 END) AS voided_count
    FROM orders
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
      AND status IN ('pending','served')
");
$monthly_stmt->execute([$year, $month]);
$monthly = $monthly_stmt->fetch(PDO::FETCH_ASSOC);

// Voided count - separate query
$voided_stmt = $pdo->prepare("
    SELECT COUNT(*) AS voided_count
    FROM orders
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    AND status = 'voided'
");
$voided_stmt->execute([$year, $month]);
$voided_data = $voided_stmt->fetch(PDO::FETCH_ASSOC);
$monthly['voided_count'] = $voided_data['voided_count'];

// ── TODAY STATS ────────────────────────────────────────────────────────
$today = date('Y-m-d');
$today_stmt = $pdo->prepare("
    SELECT COUNT(*) AS orders_today, COALESCE(SUM(total), 0) AS sales_today
    FROM orders
    WHERE DATE(created_at) = ? AND status IN ('pending','served')
");
$today_stmt->execute([$today]);
$today_data = $today_stmt->fetch(PDO::FETCH_ASSOC);

// ── DAILY SALES (for chart) ────────────────────────────────────────────
$daily_stmt = $pdo->prepare("
    SELECT DATE(created_at) AS sale_date,
           COALESCE(SUM(total), 0) AS total_sales
    FROM orders
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
      AND status IN ('pending','served')
    GROUP BY DATE(created_at)
    ORDER BY sale_date ASC
");
$daily_stmt->execute([$year, $month]);
$daily_data = $daily_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── TOP ITEMS ──────────────────────────────────────────────────────────
$top_stmt = $pdo->prepare("
    SELECT oi.name,
           SUM(oi.quantity)                        AS total_qty,
           COALESCE(SUM(oi.quantity * oi.price),0) AS total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
      AND o.status IN ('pending','served')
    GROUP BY oi.name
    ORDER BY total_qty DESC
    LIMIT 5
");
$top_stmt->execute([$year, $month]);
$top_items = $top_stmt->fetchAll(PDO::FETCH_ASSOC);
$max_qty = !empty($top_items) ? (int)$top_items[0]['total_qty'] : 1;

// ── WEEKLY BREAKDOWN ───────────────────────────────────────────────────
$weekly_stmt = $pdo->prepare("
    SELECT
        YEARWEEK(created_at, 1)                       AS yw,
        MIN(DATE(created_at))                         AS week_start,
        MAX(DATE(created_at))                         AS week_end,
        COUNT(*)                                      AS total_orders,
        COUNT(CASE WHEN status='served'  THEN 1 END)  AS served,
        COUNT(CASE WHEN status='pending' THEN 1 END)  AS pending,
        COUNT(CASE WHEN status='voided'  THEN 1 END)  AS voided,
        COALESCE(SUM(total), 0)                       AS total_sales
    FROM orders
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
      AND status IN ('pending','served','voided')
    GROUP BY YEARWEEK(created_at, 1)
    ORDER BY yw ASC
");
$weekly_stmt->execute([$year, $month]);
$weekly_data = $weekly_stmt->fetchAll(PDO::FETCH_ASSOC);

// ── CHART JSON ─────────────────────────────────────────────────────────
$chart_labels = json_encode(array_map(fn($d) => date('M j', strtotime($d['sale_date'])), $daily_data));
$chart_values = json_encode(array_map(fn($d) => (float)$d['total_sales'], $daily_data));

$last_updated = date('F j, Y g:i:s A');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="5;url=?year=<?= $year ?>&month=<?= $month ?>">
    <title>Live Report — Twist &amp; Roll</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Poppins', sans-serif;
            background: #F5F0DC;
            min-height: 100vh;
            padding-bottom: 60px;
        }

        /* ── HEADER ── */
        .lh {
            background: #1C3924;
            padding: 14px 28px;
            display: flex;
            align-items: center;
            gap: 14px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 16px rgba(0,0,0,0.22);
        }
        .lh__left  { flex: 1; }
        .lh__brand { display: flex; align-items: center; gap: 10px; }
        .lh__emoji { font-size: 22px; }
        .lh__title { font-size: 17px; font-weight: 700; color: #fff; }
        .lh__sub   { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 1px; }
        .lh__right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .live-badge {
            display: flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 999px; padding: 5px 14px;
            font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.5px;
        }
        .live-dot {
            width: 8px; height: 8px; border-radius: 50%; background: #6EE784;
            animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.4; transform:scale(0.65); }
        }

        .lh__selectors { display: flex; gap: 6px; }
        .lh__sel {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px; padding: 6px 10px;
            font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600;
            color: #fff; cursor: pointer; outline: none;
            appearance: none; -webkit-appearance: none;
            min-width: 80px; text-align: center;
        }
        .lh__sel option { color: #1C3924; background: #fff; }
        .lh__updated { font-size: 10.5px; color: rgba(255,255,255,0.45); white-space: nowrap; }

        /* ── BODY ── */
        .lb {
            max-width: 1100px; margin: 0 auto;
            padding: 24px 20px;
            display: flex; flex-direction: column; gap: 20px;
        }

        /* ── STAT CARDS ── */
        .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .stat-card {
            background: #fff; border-radius: 14px; padding: 18px 20px;
            border-top: 3px solid transparent;
            box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }
        .stat-card--green { border-color: #1C3924; }
        .stat-card--gold  { border-color: #C99813; }
        .stat-card--blue  { border-color: #4A90D9; }
        .stat-card--red   { border-color: #C0392B; }
        .stat-card__icon  { font-size: 22px; margin-bottom: 10px; }
        .stat-card__label { font-size: 10.5px; font-weight: 600; color: #8A9A8D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .stat-card__val   { font-size: 24px; font-weight: 700; color: #1C3924; line-height: 1.1; }
        .stat-card__sub   { font-size: 11px; color: #aab6ae; margin-top: 4px; }

        /* ── TODAY BAR ── */
        .today-bar {
            background: #fff; border-radius: 14px; padding: 16px 22px;
            display: flex; align-items: center; gap: 18px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.06);
            border-left: 4px solid #C99813;
        }
        .today-bar__icon   { font-size: 28px; }
        .today-bar__left   { flex: 1; }
        .today-bar__label  { font-size: 10px; font-weight: 700; color: #8A9A8D; text-transform: uppercase; letter-spacing: 0.8px; }
        .today-bar__date   { font-size: 16px; font-weight: 700; color: #1C3924; margin-top: 2px; }
        .today-bar__stats  { display: flex; gap: 32px; }
        .today-bar__stat   { text-align: right; }
        .today-bar__stat-label { font-size: 10px; font-weight: 600; color: #8A9A8D; text-transform: uppercase; letter-spacing: 0.5px; }
        .today-bar__stat-val   { font-size: 22px; font-weight: 700; color: #1C3924; }

        /* ── TWO COL ── */
        .two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }

        /* ── CARD ── */
        .card { background: #fff; border-radius: 14px; padding: 20px 22px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .card__title { font-size: 13.5px; font-weight: 700; color: #1C3924; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

        /* ── TOP ITEMS ── */
        .top-item { margin-bottom: 14px; }
        .top-item:last-child { margin-bottom: 0; }
        .top-item__row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
        .top-item__name { font-size: 13px; font-weight: 600; color: #1C3924; }
        .top-item__meta { font-size: 11px; color: #8A9A8D; }
        .top-item__bar-bg   { height: 8px; background: #F0ECD8; border-radius: 999px; overflow: hidden; }
        .top-item__bar-fill { height: 100%; background: #1C3924; border-radius: 999px; }
        .top-item__bar-fill--gold { background: #C99813; }

        /* ── WEEKLY TABLE ── */
        .weekly-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .weekly-table th {
            text-align: left; padding: 8px 10px;
            font-size: 11px; font-weight: 600; color: #8A9A8D;
            text-transform: uppercase; letter-spacing: 0.4px;
            border-bottom: 1.5px solid #F0ECD8;
        }
        .weekly-table td { padding: 10px 10px; color: #2E3D32; border-bottom: 1px solid #F5F0DC; }
        .weekly-table tr:last-child td { border-bottom: none; }
        .w-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
        .w-badge--served  { background:#EFFAD4; color:#3a6b30; }
        .w-badge--pending { background:#FFF4CC; color:#a88a20; }
        .w-badge--voided { background:#FFE8E8; color:#980E0E; }

        .no-data { text-align: center; padding: 30px; color: #aab6ae; font-size: 13px; }

        /* ── REFRESH BAR ── */
        .refresh-bar {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: #1C3924;
            color: rgba(255,255,255,0.65);
            text-align: center; font-size: 12px; padding: 9px;
            font-family: 'Poppins', sans-serif;
            display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .refresh-bar__count { color:#6EE784; font-weight:700; font-size:13px; min-width:14px; display:inline-block; }
        .refresh-bar__progress { width:120px; height:4px; background:rgba(255,255,255,0.15); border-radius:999px; overflow:hidden; }
        .refresh-bar__fill { height:100%; background:#6EE784; border-radius:999px; animation:progressBar 5s linear forwards; }
        @keyframes progressBar { from{width:100%} to{width:0%} }
        .refresh-now-btn {
            background: rgba(255,255,255,0.15); border: none; color: #fff;
            font-family: 'Poppins',sans-serif; font-size: 11px; font-weight: 600;
            padding: 3px 10px; border-radius: 999px; cursor: pointer;
        }
        .refresh-now-btn:hover { background: rgba(255,255,255,0.25); }

        @media (max-width: 900px) {
            .stat-grid { grid-template-columns: repeat(2,1fr); }
            .two-col   { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
            .stat-grid { grid-template-columns: 1fr 1fr; }
            .lh { flex-wrap: wrap; gap: 10px; }
        }
    </style>
</head>
<body>

<header class="lh">
    <div class="lh__left">
        <div class="lh__brand">
            <span class="lh__emoji">🍣</span>
            <div>
                <div class="lh__title">Twist &amp; Roll — Live Report</div>
                <div class="lh__sub"><?= $months_list[$month] ?> <?= $year ?> &nbsp;·&nbsp; Real-time data</div>
            </div>
        </div>
    </div>
    <div class="lh__right">
        <div class="live-badge">
            <span class="live-dot"></span>
            LIVE
        </div>
        <form method="GET" id="sel-form" style="display:contents;">
            <div class="lh__selectors">
                <select name="month" class="lh__sel" onchange="document.getElementById('sel-form').submit()">
                    <?php foreach ($months_list as $num => $name): ?>
                    <option value="<?= $num ?>" <?= $num == $month ? 'selected' : '' ?>><?= substr($name,0,3) ?></option>
                    <?php endforeach; ?>
                </select>
                <select name="year" class="lh__sel" onchange="document.getElementById('sel-form').submit()">
                    <?php foreach ($year_range as $yr): ?>
                    <option value="<?= $yr ?>" <?= $yr == $year ? 'selected' : '' ?>><?= $yr ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </form>
    </div>
</header>

<div style="background:#15301e;text-align:center;padding:6px;font-family:'Poppins',sans-serif;font-size:11px;color:rgba(255,255,255,0.45);position:sticky;top:72px;z-index:99;">
    Last updated: <?= $last_updated ?>
</div>

<div class="lb">

    <!-- STAT CARDS -->
    <div class="stat-grid">
        <div class="stat-card stat-card--green">
            <div class="stat-card__icon">💰</div>
            <div class="stat-card__label">Total Sales</div>
            <div class="stat-card__val">₱<?= number_format($monthly['total_sales'],0) ?></div>
            <div class="stat-card__sub"><?= $months_list[$month] ?> <?= $year ?></div>
        </div>
        <div class="stat-card stat-card--gold">
            <div class="stat-card__icon">🛒</div>
            <div class="stat-card__label">Total Orders</div>
            <div class="stat-card__val"><?= $monthly['total_orders'] ?></div>
            <div class="stat-card__sub"><?= $monthly['served_count'] ?> served &nbsp;·&nbsp; <?= $monthly['pending_count'] ?> pending</div>
        </div>
        <div class="stat-card stat-card--blue">
            <div class="stat-card__icon">📊</div>
            <div class="stat-card__label">Avg Order Value</div>
            <div class="stat-card__val">₱<?= number_format($monthly['avg_order'],0) ?></div>
            <div class="stat-card__sub">per transaction</div>
        </div>
        <div class="stat-card stat-card--red">
            <div class="stat-card__icon">🏷️</div>
            <div class="stat-card__label">Total Discounts</div>
            <div class="stat-card__val">₱<?= number_format($monthly['total_discounts'],0) ?></div>
            <div class="stat-card__sub"><?= $monthly['voided_count'] ?> voided orders</div>
        </div>
    </div>

    <!-- TODAY BAR -->
    <div class="today-bar">
        <div class="today-bar__icon">📅</div>
        <div class="today-bar__left">
            <div class="today-bar__label">Today</div>
            <div class="today-bar__date"><?= date('l, F j, Y') ?></div>
        </div>
        <div class="today-bar__stats">
            <div class="today-bar__stat">
                <div class="today-bar__stat-label">Orders Today</div>
                <div class="today-bar__stat-val"><?= $today_data['orders_today'] ?></div>
            </div>
            <div class="today-bar__stat">
                <div class="today-bar__stat-label">Sales Today</div>
                <div class="today-bar__stat-val">₱<?= number_format($today_data['sales_today'],0) ?></div>
            </div>
        </div>
    </div>

    <!-- DAILY CHART + TOP ITEMS -->
    <div class="two-col">
        <div class="card">
            <div class="card__title">📈 Daily Sales — <?= $months_list[$month] ?></div>
            <?php if (empty($daily_data)): ?>
            <div class="no-data">No sales data for this month.</div>
            <?php else: ?>
            <canvas id="dailyChart" height="140"></canvas>
            <?php endif; ?>
        </div>
        <div class="card">
            <div class="card__title">🏆 Top Items — <?= $months_list[$month] ?></div>
            <?php if (empty($top_items)): ?>
            <div class="no-data">No items data for this month.</div>
            <?php else: ?>
            <?php foreach ($top_items as $idx => $item): ?>
            <div class="top-item">
                <div class="top-item__row">
                    <span class="top-item__name"><?= htmlspecialchars($item['name']) ?></span>
                    <span class="top-item__meta"><?= (int)$item['total_qty'] ?> orders &nbsp;·&nbsp; ₱<?= number_format($item['total_revenue'],0) ?></span>
                </div>
                <div class="top-item__bar-bg">
                    <div class="top-item__bar-fill <?= $idx===0 ? 'top-item__bar-fill--gold' : '' ?>"
                         style="width:<?= $max_qty>0 ? round(($item['total_qty']/$max_qty)*100) : 0 ?>%"></div>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <!-- WEEKLY BREAKDOWN -->
    <div class="card">
        <div class="card__title">📆 Weekly Breakdown — <?= $months_list[$month] ?> <?= $year ?></div>
        <?php if (empty($weekly_data)): ?>
        <div class="no-data">No weekly data for this month.</div>
        <?php else: ?>
        <table class="weekly-table">
            <thead>
                <tr>
                    <th>Week</th>
                    <th>Date Range</th>
                    <th>Orders</th>
                    <th>Served</th>
                    <th>Pending</th>
                    <th>Voided</th>
                    <th>Total Sales</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($weekly_data as $idx => $w): ?>
            <tr>
                <td><strong>Week <?= $idx+1 ?></strong></td>
                <td><?= date('M j', strtotime($w['week_start'])) ?> – <?= date('M j', strtotime($w['week_end'])) ?></td>
                <td><?= (int)$w['total_orders'] ?></td>
                <td><span class="w-badge w-badge--served"><?= (int)$w['served'] ?></span></td>
                <td><span class="w-badge w-badge--pending"><?= (int)$w['pending'] ?></span></td>
                <td><span class="w-badge w-badge--voided"><?= (int)($w['voided'] ?? 0) ?></span></td>
                <td><strong>₱<?= number_format($w['total_sales'],0) ?></strong></td>
            </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </div>

</div>

<!-- REFRESH BAR -->
<div class="refresh-bar">
    <span>Refreshing in</span>
    <span class="refresh-bar__count" id="countdown">5</span>
    <div class="refresh-bar__progress"><div class="refresh-bar__fill"></div></div>
    <span>·</span>
    <span><?= (int)$today_data['orders_today'] ?> order<?= $today_data['orders_today'] != 1 ? 's' : '' ?> today</span>
    <span>·</span>
    <button class="refresh-now-btn" onclick="location.reload()">Now</button>
</div>

<script>
<?php if (!empty($daily_data)): ?>
(function() {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: <?= $chart_labels ?>,
            datasets: [{
                data: <?= $chart_values ?>,
                borderColor: '#1C3924',
                backgroundColor: 'rgba(28,57,36,0.07)',
                pointBackgroundColor: '#C99813',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.35,
                fill: true,
                borderWidth: 2.5,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => '₱' + c.parsed.y.toLocaleString() } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '₱' + (v>=1000?(v/1000).toFixed(0)+'k':v), font:{family:'Poppins',size:11}, color:'#5A6B5E' },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                x: {
                    ticks: { font:{family:'Poppins',size:11}, color:'#5A6B5E' },
                    grid: { display: false }
                }
            }
        }
    });
})();
<?php endif; ?>

// Countdown
(function() {
    let n = 5;
    const el = document.getElementById('countdown');
    const t = setInterval(() => { n--; if(el) el.textContent=n; if(n<=0) clearInterval(t); }, 1000);
})();
</script>
</body>
</html>