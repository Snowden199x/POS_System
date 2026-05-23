<?php
session_start();
if (!isset($_SESSION["logged_in"])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../db/connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['order_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing order ID']);
    exit();
}

try {
    $pdo->beginTransaction();

    $orig_stmt = $pdo->prepare("SELECT total, payment_method FROM orders WHERE id = ?");
    $orig_stmt->execute([$data['order_id']]);
    $original       = $orig_stmt->fetch();
    $original_total = (float)$original['total'];
    $new_total      = (float)$data['total'];
    $diff           = $new_total - $original_total;

    $gcash_extra_ref    = $data['gcash_ref']      ?? null;   // extra ref for added items
    $gcash_extra_amount = $data['gcash_extra_amount'] ?? 0;  // amount of extra gcash payment
    $refund_amount      = $data['refund_amount']   ?? 0;     // refund if cheaper

    // Validate extra GCash ref if provided
    if (!empty($gcash_extra_ref) && !preg_match('/^\d{13}$/', $gcash_extra_ref)) {
        echo json_encode(['success' => false, 'message' => 'Invalid GCash reference number. Must be 13 digits.']);
        exit();
    }

    $stmt = $pdo->prepare("
        UPDATE orders
        SET
            beeper_number         = ?,
            order_type            = ?,
            payment_method        = ?,
            amount_paid           = ?,
            subtotal              = ?,
            discount              = ?,
            total                 = ?,
            gcash_reference_extra = COALESCE(NULLIF(?, ''), gcash_reference_extra),
            gcash_extra_amount    = ?,
            refund_amount         = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $data['beeper_number'],
        $data['order_type'],
        $data['payment_method'],
        $data['amount_paid'] ?? $data['total'],
        $data['subtotal']    ?? $data['total'],
        $data['discount']    ?? 0,
        $data['total'],
        $gcash_extra_ref,
        $gcash_extra_amount,
        $refund_amount,
        $data['order_id'],
    ]);

    if (!empty($data['items'])) {
        $del = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
        $del->execute([$data['order_id']]);

        $ins = $pdo->prepare("
            INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($data['items'] as $item) {
            $ins->execute([
                $data['order_id'],
                $item['id'],
                $item['name'],
                $item['price'],
                $item['qty'],
            ]);
        }
    }

    $pdo->commit();
    echo json_encode([
        'success'       => true,
        'diff'          => $diff,
        'refund_amount' => $refund_amount,
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}