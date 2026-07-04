<?php
session_start();
if (!isset($_SESSION["logged_in"])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../db/connection.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT * FROM receipt_settings WHERE id = 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        // Return safe defaults if row doesn't exist yet
        $settings = [
            'store_name'      => 'Twist & Roll',
            'store_address'   => '',
            'store_contact'   => '',
            'receipt_header'  => '',
            'receipt_footer'  => 'Thank you for dining with us!',
            'show_discount'   => 1,
            'show_cashier'    => 1,
            'show_order_type' => 1,
            'show_beeper'     => 1,
        ];
    }

    // Also fetch the cashier name (full_name from users table)
    $user_stmt = $pdo->query("SELECT full_name FROM users WHERE id = 1");
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    $settings['cashier_name'] = $user['full_name'] ?? '';

    // Cast toggles to bool so JS gets true/false
    $settings['show_discount']   = (bool)$settings['show_discount'];
    $settings['show_cashier']    = (bool)$settings['show_cashier'];
    $settings['show_order_type'] = (bool)$settings['show_order_type'];
    $settings['show_beeper']     = (bool)$settings['show_beeper'];

    echo json_encode(['success' => true, 'settings' => $settings]);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>