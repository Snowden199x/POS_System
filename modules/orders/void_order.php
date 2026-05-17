<?php
session_start();
if (!isset($_SESSION["logged_in"])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../db/connection.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['order_id'])) {
    echo json_encode(['success' => false, 'message' => 'No order ID']);
    exit();
}

try {
    $stmt = $pdo->prepare("UPDATE orders SET status = 'voided' WHERE id = ?");
    $stmt->execute([$data['order_id']]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>