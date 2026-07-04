<?php
// ─── /api/documents/* (all require Bearer auth) ──────────────────────────────

function handle_documents(array $segments, string $method): void
{
    $user = require_auth();

    // /documents/:id/download
    if (isset($segments[2]) && $segments[2] === 'download' && $method === 'GET') {
        documents_download($user, $segments[1]);
        return;
    }
    // /documents/upload
    if (isset($segments[1]) && $segments[1] === 'upload' && $method === 'POST') {
        documents_upload($user);
        return;
    }
    // /documents/:id  (DELETE)
    if (isset($segments[1]) && $segments[1] !== '' && $method === 'DELETE') {
        documents_delete($user, $segments[1]);
        return;
    }
    // /documents  (GET list)
    if (!isset($segments[1]) && $method === 'GET') {
        documents_list($user);
        return;
    }

    send_json(['message' => 'المسار غير موجود'], 404);
}

function documents_list(array $user): void
{
    $pdo = db();
    $category = $_GET['category'] ?? null;
    $sort = $_GET['sort'] ?? 'newest';

    $query = 'SELECT d.*, c.name as category_name
              FROM documents d
              LEFT JOIN categories c ON d.category_id = c.id
              WHERE d.user_id = ?';
    $params = [$user['id']];

    if ($category && $category !== 'all') {
        $query .= ' AND d.category_id = ?';
        $params[] = $category;
    }

    $sortMap = [
        'newest' => 'd.uploaded_at DESC',
        'oldest' => 'd.uploaded_at ASC',
        'name' => 'd.original_name ASC',
    ];
    $query .= ' ORDER BY ' . ($sortMap[$sort] ?? $sortMap['newest']);

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    send_json($stmt->fetchAll());
}

function documents_upload(array $user): void
{
    // Per-user upload rate limit — 20 / hour
    if (!rate_limit('upload:' . $user['id'], 20, 3600)) {
        send_json(['message' => 'تجاوزت الحد المسموح به. حاول مجدداً بعد ساعة.'], 429);
    }

    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        send_json(['message' => 'لم يتم رفع أي ملف'], 400);
    }
    $file = $_FILES['file'];

    // Handle PHP upload errors (size limit etc.)
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
            send_json(['message' => 'حجم الملف يتجاوز الحد المسموح (' . MAX_FILE_SIZE_MB . ' ميغابايت)'], 400);
        }
        if ($file['error'] === UPLOAD_ERR_NO_FILE) {
            send_json(['message' => 'لم يتم رفع أي ملف'], 400);
        }
        send_json(['message' => 'خطأ في رفع الملف'], 400);
    }

    // Enforce max size (in case PHP ini allows larger)
    if (($file['size'] ?? 0) > MAX_FILE_SIZE_MB * 1024 * 1024) {
        send_json(['message' => 'حجم الملف يتجاوز الحد المسموح (' . MAX_FILE_SIZE_MB . ' ميغابايت)'], 400);
    }

    // MIME check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if ($mime !== 'application/pdf') {
        send_json(['message' => 'يُسمح فقط بملفات PDF'], 400);
    }

    // Magic-bytes check — first 5 bytes must be "%PDF-"
    $fh = fopen($file['tmp_name'], 'rb');
    $head = $fh ? fread($fh, 5) : '';
    if ($fh) {
        fclose($fh);
    }
    if ($head !== '%PDF-') {
        send_json(['message' => 'الملف ليس ملف PDF صالحاً'], 400);
    }

    // documentName is required
    $documentName = trim((string) ($_POST['documentName'] ?? ''));
    if ($documentName === '') {
        send_json(['message' => 'اسم الوثيقة مطلوب'], 400);
    }
    $categoryId = $_POST['categoryId'] ?? null;
    if ($categoryId === '') {
        $categoryId = null;
    }

    $pdo = db();

    if ($categoryId) {
        $catStmt = $pdo->prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?');
        $catStmt->execute([$categoryId, $user['id']]);
        if (!$catStmt->fetch()) {
            send_json(['message' => 'الفئة غير صالحة'], 400);
        }
    }

    // Store the file
    $dir = ensure_user_dir($user['id']);
    $storedName = uuidv4() . '.pdf';
    $dest = $dir . '/' . $storedName;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        // Fallback for CLI/test environments where move_uploaded_file requires an HTTP upload
        if (!@rename($file['tmp_name'], $dest)) {
            send_json(['message' => 'تعذر حفظ الملف على الخادم'], 500);
        }
    }

    $docId = uuidv4();
    $pdo->prepare(
        'INSERT INTO documents (id, user_id, category_id, original_name, stored_name, file_size)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([
        $docId,
        $user['id'],
        $categoryId ?: null,
        mb_substr($documentName, 0, 200),
        $storedName,
        (int) $file['size'],
    ]);

    $docStmt = $pdo->prepare(
        'SELECT d.*, c.name as category_name
         FROM documents d
         LEFT JOIN categories c ON d.category_id = c.id
         WHERE d.id = ?'
    );
    $docStmt->execute([$docId]);
    send_json($docStmt->fetch(), 201);
}

function documents_download(array $user, string $id): void
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    $doc = $stmt->fetch();

    if (!$doc) {
        send_json(['message' => 'الوثيقة غير موجودة'], 404);
    }

    $filePath = UPLOAD_PATH . '/' . $user['id'] . '/' . $doc['stored_name'];

    // Prevent path traversal
    $resolved = realpath($filePath);
    $uploadsBase = realpath(UPLOAD_PATH);
    if ($resolved === false || $uploadsBase === false || strpos($resolved, $uploadsBase) !== 0) {
        send_json(['message' => 'ملف الوثيقة غير موجود على الخادم'], 404);
    }

    $filename = rawurlencode($doc['original_name']) . '.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($resolved));
    header('X-Content-Type-Options: nosniff');
    readfile($resolved);
    exit;
}

function documents_delete(array $user, string $id): void
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user['id']]);
    $doc = $stmt->fetch();

    if (!$doc) {
        send_json(['message' => 'الوثيقة غير موجودة'], 404);
    }

    $filePath = UPLOAD_PATH . '/' . $user['id'] . '/' . $doc['stored_name'];
    if (is_file($filePath)) {
        @unlink($filePath);
    }

    $pdo->prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
    send_json(['message' => 'تم حذف الوثيقة بنجاح']);
}
