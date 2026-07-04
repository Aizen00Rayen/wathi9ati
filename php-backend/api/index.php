<?php
// ─── Front controller — routes /api/* requests to handlers ───────────────────
// All requests to /api are rewritten here by api/.htaccess.

require_once __DIR__ . '/lib.php';

// ─── CORS ────────────────────────────────────────────────────────────────────
// Same-origin (production) requests have no Origin header. In dev the Vite server
// (FRONTEND_URL) is on a different origin and needs credentialed CORS.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = array_filter([
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5000',
]);
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Basic security headers (helmet-equivalent) ──────────────────────────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: no-referrer');
header_remove('X-Powered-By');

// ─── Global rate limiter — 200 requests / 15 min per IP ──────────────────────
if (!rate_limit('global:' . client_ip(), 200, 900)) {
    send_json(['message' => 'طلبات كثيرة جداً. الرجاء الانتظار.'], 429);
}

// ─── Resolve the route path relative to the api/ base ────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$uri = rawurldecode($uri);

// Base dir of this script, e.g. "/api" (handles subfolder installs too)
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
$route = $uri;
if ($base !== '' && strpos($uri, $base) === 0) {
    $route = substr($uri, strlen($base));
}
$route = '/' . trim($route, '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Split into segments: ['auth','login'] etc.
$segments = $route === '/' ? [] : explode('/', trim($route, '/'));
$resource = $segments[0] ?? '';

// ─── Health check ────────────────────────────────────────────────────────────
if ($route === '/health' && $method === 'GET') {
    send_json(['status' => 'ok', 'app' => 'وثيقتي']);
}

// ─── Dispatch to resource handlers ───────────────────────────────────────────
try {
    switch ($resource) {
        case 'auth':
            require __DIR__ . '/routes/auth.php';
            handle_auth($segments, $method);
            break;
        case 'documents':
            require __DIR__ . '/routes/documents.php';
            handle_documents($segments, $method);
            break;
        case 'categories':
            require __DIR__ . '/routes/categories.php';
            handle_categories($segments, $method);
            break;
        case 'contact':
            require __DIR__ . '/routes/contact.php';
            handle_contact($segments, $method);
            break;
        default:
            send_json(['message' => 'المسار غير موجود'], 404);
    }
} catch (\Throwable $e) {
    error_log('Wathi9ati API error: ' . $e->getMessage());
    send_json(['message' => 'خطأ داخلي في الخادم'], 500);
}

// If a handler returned without responding, treat as 404
send_json(['message' => 'المسار غير موجود'], 404);
