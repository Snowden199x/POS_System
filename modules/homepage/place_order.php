<?php
session_start();
require_once __DIR__ . '/../../db/connection.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['items'])) {
    echo json_encode(['success' => false, 'message' => 'No items']);
    exit();
}

// ── Branch ID comes from session (user_id = branch_id) ────────────────────
$branch_id = $_SESSION['user_id'] ?? 1;

try {
    $beeperCheck = $pdo->prepare("
        SELECT id FROM orders
        WHERE beeper_number = ? AND status = 'pending' AND branch_id = ?
    ");
    $beeperCheck->execute([$data['beeper_number'], $branch_id]);
    if ($beeperCheck->fetch()) {
        echo json_encode(['success' => false, 'message' => 'beeper_in_use']);
        exit();
    }

    $pdo->beginTransaction();

    $gcashRef = trim($data['gcash_reference'] ?? '');
    if (!empty($gcashRef) && !preg_match('/^\d{13}$/', $gcashRef)) {
        echo json_encode(['success' => false, 'message' => 'Invalid GCash reference number.']);
        exit();
    }

    $stmt = $pdo->prepare("
        INSERT INTO orders
            (branch_id, beeper_number, order_type, payment_method, amount_paid,
             gcash_reference, subtotal, discount, total, change_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $branch_id,
        $data['beeper_number'],
        $data['order_type'],
        $data['payment_method'],
        $data['amount_paid'],
        $gcashRef,
        $data['subtotal'],
        $data['discount'],
        $data['total'],
        $data['change_amount'],
    ]);

    $order_id = $pdo->lastInsertId();

    $itemStmt = $pdo->prepare("
        INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
    ");
    foreach ($data['items'] as $item) {
        $itemStmt->execute([
            $order_id,
            $item['id'],
            $item['name'],
            $item['price'],
            $item['qty'],
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'order_id' => $order_id]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>