<?php
// ─── /api/auth/* ─────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
    'وثائق الهوية',
    'وثائق السكن',
    'التعليم والعمل',
    'أخرى',
];

function handle_auth(array $segments, string $method): void
{
    $action = $segments[1] ?? '';

    if ($action === 'register' && $method === 'POST') {
        auth_register();
    } elseif ($action === 'login' && $method === 'POST') {
        auth_login();
    } elseif ($action === 'refresh' && $method === 'POST') {
        auth_refresh();
    } elseif ($action === 'logout' && $method === 'POST') {
        auth_logout();
    } else {
        send_json(['message' => 'المسار غير موجود'], 404);
    }
}

function auth_register(): void
{
    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));
    $email = normalize_email((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $confirm = (string) ($body['confirmPassword'] ?? '');

    $errors = [];
    if ($name === '') {
        $errors[] = ['msg' => 'الاسم مطلوب', 'path' => 'name'];
    } elseif (mb_strlen($name) > 100) {
        $errors[] = ['msg' => 'الاسم طويل جداً', 'path' => 'name'];
    }
    if (!is_valid_email($email)) {
        $errors[] = ['msg' => 'البريد الإلكتروني غير صالح', 'path' => 'email'];
    }
    if (mb_strlen($password) < 8) {
        $errors[] = ['msg' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'path' => 'password'];
    }
    if ($confirm !== $password) {
        $errors[] = ['msg' => 'كلمتا المرور غير متطابقتين', 'path' => 'confirmPassword'];
    }
    if ($errors) {
        send_validation_errors($errors);
    }

    $pdo = db();

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        send_json(['message' => 'البريد الإلكتروني مستخدم بالفعل'], 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $userId = uuidv4();

    $pdo->prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
        ->execute([$userId, $name, $email, $passwordHash]);

    $catStmt = $pdo->prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)');
    foreach (DEFAULT_CATEGORIES as $catName) {
        $catStmt->execute([uuidv4(), $userId, $catName]);
    }

    ensure_user_dir($userId);

    $user = ['id' => $userId, 'name' => $name, 'email' => $email];
    $tokens = generate_tokens($user);
    store_refresh_token($userId, $tokens['refreshToken']);
    set_refresh_cookie($tokens['refreshToken']);

    send_json(['accessToken' => $tokens['accessToken'], 'user' => $user], 201);
}

function auth_login(): void
{
    $body = json_body();
    $email = normalize_email((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    $errors = [];
    if (!is_valid_email($email)) {
        $errors[] = ['msg' => 'البريد الإلكتروني غير صالح', 'path' => 'email'];
    }
    if ($password === '') {
        $errors[] = ['msg' => 'كلمة المرور مطلوبة', 'path' => 'password'];
    }
    if ($errors) {
        send_validation_errors($errors);
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        send_json(['message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة'], 401);
    }

    $userData = ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']];
    $tokens = generate_tokens($userData);
    store_refresh_token($user['id'], $tokens['refreshToken']);
    set_refresh_cookie($tokens['refreshToken']);

    send_json(['accessToken' => $tokens['accessToken'], 'user' => $userData]);
}

function auth_refresh(): void
{
    $token = $_COOKIE['refreshToken'] ?? '';
    if ($token === '') {
        send_json(['message' => 'لا يوجد رمز تحديث'], 401);
    }

    $result = jwt_verify($token, JWT_REFRESH_SECRET);
    if (isset($result['error'])) {
        send_json(['message' => 'رمز التحديث غير صالح'], 401);
    }
    $decoded = $result['payload'];
    $userId = $decoded['userId'] ?? '';

    $pdo = db();
    $hash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        "SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')"
    );
    $stmt->execute([$userId, $hash]);
    $stored = $stmt->fetch();

    if (!$stored) {
        send_json(['message' => 'رمز التحديث غير صالح أو منتهي الصلاحية'], 401);
    }

    $uStmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $uStmt->execute([$userId]);
    $user = $uStmt->fetch();
    if (!$user) {
        send_json(['message' => 'المستخدم غير موجود'], 401);
    }

    // Rotate refresh token
    $pdo->prepare('DELETE FROM refresh_tokens WHERE id = ?')->execute([$stored['id']]);
    $tokens = generate_tokens($user);
    store_refresh_token($user['id'], $tokens['refreshToken']);
    set_refresh_cookie($tokens['refreshToken']);

    send_json(['accessToken' => $tokens['accessToken'], 'user' => $user]);
}

function auth_logout(): void
{
    $token = $_COOKIE['refreshToken'] ?? '';
    if ($token !== '') {
        $hash = hash('sha256', $token);
        db()->prepare('DELETE FROM refresh_tokens WHERE token_hash = ?')->execute([$hash]);
    }
    clear_refresh_cookie();
    send_json(['message' => 'تم تسجيل الخروج بنجاح']);
}
