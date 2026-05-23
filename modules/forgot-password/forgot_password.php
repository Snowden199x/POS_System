<?php
session_start();

if (isset($_SESSION["logged_in"])) {
    header("Location: ../../index.php?page=home");
    exit();
}

$alert = [];

if (isset($_GET['status'])) {
    switch ($_GET['status']) {
        case 'sent':
            $alert = [
                'type'    => 'success',
                'message' => 'Reset link sent! Please check your email.'
            ];
            break;
        case 'notfound':
            $alert = [
                'type'    => 'error',
                'message' => 'No account found with that email.'
            ];
            break;
        case 'error':
            $alert = [
                'type'    => 'error',
                'message' => 'Something went wrong. Please try again.'
            ];
            break;
    }
}

include 'forgot_password_view.php';
?>