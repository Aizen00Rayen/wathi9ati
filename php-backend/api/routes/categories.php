<?php
// ─── /api/categories/* (all require Bearer auth) ─────────────────────────────

function handle_categories(array $segments, string $method): void
{
    $user = require_auth();

    if (!isset($segments[1]) && $method === 'GET') {
        categories_list($user);
        return;
    }
    if (!isset($segments[1]) && $method === 'POST') {
        categories_create($user);
        return;
    }
    if (isset($segments[1]) && $segments[1] !== '' && $method === 'DELETE') {
        categories_delete($user, $segments[1]);
        return;
    }

    send_json(['message' => 'المسار غير موجود'], 404);
}

function categories_list(array $user): void
{
    $stmt = db()->prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC');
    $stmt->execute([$user['id']]);
    send_json($stmt->fetchAll());
}

function categories_create(array $user): void
{
    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));

    $errors = [];
    if ($name === '') {
        $errors[] = ['msg' => 'اسم الفئة مطلوب', 'path' => 'name'];
    } elseif (mb_strlen($name) > 80) {
        $errors[] = ['msg' => 'الاسم طويل جداً', 'path' => 'name'];
    }
    if ($errors) {
        send_validation_errors($errors);
    }

    $pdo = db();

    $countStmt = $pdo->prepare('SELECT COUNT(*) as c FROM categories WHERE user_id = ?');
    $countStmt->execute([$user['id']]);
    if ((int) $countStmt->fetch()['c'] >= 20) {
        send_json(['message' => 'لا يمكن إضافة أكثر من 20 فئة'], 400);
    }

    $id = uuidv4();
    $pdo->prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)')
        ->execute([$id, $user['id'], $name]);

    $catStmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $catStmt->execute([$id]);
    send_json($catStmt->fetch(), 201);
}

function categories_delete(array $user, string $id): void
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    if (!$stmt->fetch()) {
        send_json(['message' => 'الفئة غير موجودة'], 404);
    }

    // Reassign documents in this category to "أخرى" (or null if it doesn't exist)
    $otherStmt = $pdo->prepare("SELECT id FROM categories WHERE user_id = ? AND name = 'أخرى'");
    $otherStmt->execute([$user['id']]);
    $other = $otherStmt->fetch();

    $pdo->prepare('UPDATE documents SET category_id = ? WHERE category_id = ? AND user_id = ?')
        ->execute([$other ? $other['id'] : null, $id, $user['id']]);

    $pdo->prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);

    send_json(['message' => 'تم حذف الفئة بنجاح']);
}
