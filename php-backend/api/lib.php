<?php
// ─── Shared helpers: DB, JWT, auth, responses, validation, rate-limit, mail ──

require_once __DIR__ . '/config.php';

// ─── Database (PDO SQLite singleton) ─────────────────────────────────────────
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dir = dirname(DB_PATH);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }

    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    $schema = file_get_contents(SCHEMA_PATH);
    if ($schema !== false) {
        $pdo->exec($schema);
    }

    return $pdo;
}

// ─── JSON responses ──────────────────────────────────────────────────────────
function send_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Mirrors express-validator's 422 { errors: [{ msg, path }] } shape
function send_validation_errors(array $errors): void
{
    send_json(['errors' => $errors], 422);
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ─── Misc helpers ────────────────────────────────────────────────────────────
function uuidv4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function client_ip(): string
{
    foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = trim(explode(',', $_SERVER[$key])[0]);
            if ($ip !== '') {
                return $ip;
            }
        }
    }
    return 'unknown';
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
        return true;
    }
    return false;
}

// ─── JWT (HS256) ─────────────────────────────────────────────────────────────
function b64url_encode(string $bin): string
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64url_decode(string $txt): string
{
    $pad = strlen($txt) % 4;
    if ($pad) {
        $txt .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($txt, '-_', '+/'));
}

function jwt_sign(array $payload, string $secret, int $ttlSeconds): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + $ttlSeconds;

    $segments = [
        b64url_encode(json_encode($header, JSON_UNESCAPED_UNICODE)),
        b64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE)),
    ];
    $signingInput = implode('.', $segments);
    $signature = hash_hmac('sha256', $signingInput, $secret, true);
    $segments[] = b64url_encode($signature);
    return implode('.', $segments);
}

// Returns ['payload' => array] on success, or ['error' => 'expired'|'invalid']
function jwt_verify(string $token, string $secret): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return ['error' => 'invalid'];
    }
    [$h, $p, $s] = $parts;

    $expected = b64url_encode(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($expected, $s)) {
        return ['error' => 'invalid'];
    }

    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload)) {
        return ['error' => 'invalid'];
    }
    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        return ['error' => 'expired'];
    }
    return ['payload' => $payload];
}

// ─── Auth middleware — validates Bearer access token ─────────────────────────
// On failure sends the JSON error and exits. On success returns the user array.
function require_auth(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$header && function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        $header = $h['Authorization'] ?? ($h['authorization'] ?? '');
    }

    if (!$header || stripos($header, 'Bearer ') !== 0) {
        send_json(['message' => 'غير مصرح — الرجاء تسجيل الدخول'], 401);
    }

    $token = trim(substr($header, 7));
    $result = jwt_verify($token, JWT_SECRET);

    if (isset($result['error'])) {
        if ($result['error'] === 'expired') {
            send_json(['message' => 'انتهت صلاحية الجلسة', 'code' => 'TOKEN_EXPIRED'], 401);
        }
        send_json(['message' => 'رمز المصادقة غير صالح'], 401);
    }

    $p = $result['payload'];
    return [
        'id' => $p['userId'] ?? null,
        'email' => $p['email'] ?? null,
        'name' => $p['name'] ?? null,
    ];
}

// ─── Fixed-window rate limiter (DB-backed) ───────────────────────────────────
// Returns true if the request is allowed, false if the limit is exceeded.
function rate_limit(string $bucket, int $points, int $durationSeconds): bool
{
    $pdo = db();
    $now = time();
    try {
        $pdo->beginTransaction();
        $row = $pdo->prepare('SELECT count, reset_at FROM rate_limits WHERE bucket = ?');
        $row->execute([$bucket]);
        $rec = $row->fetch();

        if (!$rec || $now >= (int) $rec['reset_at']) {
            $pdo->prepare(
                'INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?, 1, ?)
                 ON CONFLICT(bucket) DO UPDATE SET count = 1, reset_at = excluded.reset_at'
            )->execute([$bucket, $now + $durationSeconds]);
            $pdo->commit();
            return true;
        }

        if ((int) $rec['count'] >= $points) {
            $pdo->commit();
            return false;
        }

        $pdo->prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ?')->execute([$bucket]);
        $pdo->commit();
        return true;
    } catch (\Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // Fail open — don't block legitimate traffic on limiter errors
        return true;
    }
}

// ─── Refresh-token cookie helpers ────────────────────────────────────────────
function set_refresh_cookie(string $token): void
{
    $expires = time() + JWT_REFRESH_EXPIRES_IN;
    $options = [
        'expires' => $expires,
        'path' => '/api/auth',
        'httponly' => true,
        'samesite' => 'Strict',
    ];
    if (APP_ENV === 'production' || is_https()) {
        $options['secure'] = true;
    }
    setcookie('refreshToken', $token, $options);
}

function clear_refresh_cookie(): void
{
    setcookie('refreshToken', '', [
        'expires' => time() - 3600,
        'path' => '/api/auth',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function store_refresh_token(string $userId, string $token): void
{
    $hash = hash('sha256', $token);
    $expiresAt = gmdate('Y-m-d H:i:s', time() + JWT_REFRESH_EXPIRES_IN);
    db()->prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
        ->execute([$userId, $hash, $expiresAt]);
}

// ─── Token pair generation ───────────────────────────────────────────────────
function generate_tokens(array $user): array
{
    $accessToken = jwt_sign(
        ['userId' => $user['id'], 'email' => $user['email'], 'name' => $user['name']],
        JWT_SECRET,
        JWT_EXPIRES_IN
    );
    $refreshToken = jwt_sign(
        ['userId' => $user['id']],
        JWT_REFRESH_SECRET,
        JWT_REFRESH_EXPIRES_IN
    );
    return ['accessToken' => $accessToken, 'refreshToken' => $refreshToken];
}

// ─── Simple validators (return null if valid, else Arabic message) ───────────
function is_valid_email(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function normalize_email(string $email): string
{
    return strtolower(trim($email));
}

// ─── Resend email (via cURL) ─────────────────────────────────────────────────
function send_email_resend(string $subject, string $html, string $replyTo): bool
{
    if (!RESEND_API_KEY) {
        return false;
    }
    $payload = [
        'from' => CONTACT_FROM,
        'to' => [CONTACT_TO],
        'reply_to' => $replyTo,
        'subject' => $subject,
        'html' => $html,
    ];

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . RESEND_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $resp !== false && $code >= 200 && $code < 300;
}

function esc_html(string $str): string
{
    return str_replace("\n", '<br>', htmlspecialchars($str, ENT_QUOTES, 'UTF-8'));
}

// ─── Per-user upload directory ───────────────────────────────────────────────
function ensure_user_dir(string $userId): string
{
    $dir = UPLOAD_PATH . '/' . $userId;
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}
