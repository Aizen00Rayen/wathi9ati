<?php
// ─── /api/contact ────────────────────────────────────────────────────────────

function handle_contact(array $segments, string $method): void
{
    if (!isset($segments[1]) && $method === 'POST') {
        contact_submit();
        return;
    }
    send_json(['message' => 'المسار غير موجود'], 404);
}

function contact_submit(): void
{
    // Rate limit — 3 messages / hour per IP
    if (!rate_limit('contact:' . client_ip(), 3, 3600)) {
        send_json(['message' => 'لقد أرسلت عدداً كبيراً من الرسائل. حاول مجدداً بعد ساعة.'], 429);
    }

    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));
    $email = normalize_email((string) ($body['email'] ?? ''));
    $subject = trim((string) ($body['subject'] ?? ''));
    $message = trim((string) ($body['message'] ?? ''));

    $errors = [];
    if ($name === '') {
        $errors[] = ['msg' => 'الاسم مطلوب', 'path' => 'name'];
    } elseif (mb_strlen($name) > 100) {
        $errors[] = ['msg' => 'الاسم طويل جداً', 'path' => 'name'];
    }
    if (!is_valid_email($email)) {
        $errors[] = ['msg' => 'البريد الإلكتروني غير صالح', 'path' => 'email'];
    }
    if ($subject === '') {
        $errors[] = ['msg' => 'الموضوع مطلوب', 'path' => 'subject'];
    } elseif (mb_strlen($subject) > 200) {
        $errors[] = ['msg' => 'الموضوع طويل جداً', 'path' => 'subject'];
    }
    if (mb_strlen($message) < 20) {
        $errors[] = ['msg' => 'الرسالة يجب أن تحتوي على 20 حرفاً على الأقل', 'path' => 'message'];
    } elseif (mb_strlen($message) > 2000) {
        $errors[] = ['msg' => 'الرسالة طويلة جداً', 'path' => 'message'];
    }
    if ($errors) {
        send_validation_errors($errors);
    }

    // 1 — Save to DB
    db()->prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
        ->execute([$name, $email, $subject, $message]);

    // 2 — Send email via Resend (best-effort; don't fail the request if it errors)
    try {
        send_email_resend(
            '📩 رسالة جديدة: ' . $subject,
            build_contact_email($name, $email, $subject, $message),
            $email
        );
    } catch (\Throwable $e) {
        error_log('Resend error: ' . $e->getMessage());
    }

    send_json(['message' => 'تم إرسال رسالتك بنجاح. سنرد عليك قريباً.'], 201);
}

function build_contact_email(string $name, string $email, string $subject, string $message): string
{
    $date = date('Y-m-d H:i');
    $n = esc_html($name);
    $e = esc_html($email);
    $s = esc_html($subject);
    $m = esc_html($message);

    return <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>رسالة جديدة — وثيقتي</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:'IBM Plex Sans Arabic',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#0D1B2A;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;font-size:36px;color:#C9A84C;font-weight:700;letter-spacing:1px;">وثيقتي</h1>
          <p style="margin:8px 0 0;color:rgba(245,240,232,0.65);font-size:13px;">محفظتك الرقمية الآمنة</p>
        </td></tr>
        <tr><td style="background:#C9A84C;padding:12px 40px;text-align:center;">
          <p style="margin:0;color:#0D1B2A;font-weight:700;font-size:14px;">📩 &nbsp; رسالة جديدة من نموذج التواصل</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;border-right:4px solid #C9A84C;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
            <td width="50%" style="padding-left:8px;">
              <div style="background:#F5F0E8;border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;">الاسم</p>
                <p style="margin:0;font-size:15px;color:#0D1B2A;font-weight:600;">$n</p>
              </div>
            </td>
            <td width="50%" style="padding-right:8px;">
              <div style="background:#F5F0E8;border-radius:10px;padding:16px 18px;">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;">البريد الإلكتروني</p>
                <p style="margin:0;font-size:15px;color:#0D1B2A;font-weight:600;">
                  <a href="mailto:$e" style="color:#C9A84C;text-decoration:none;">$e</a>
                </p>
              </div>
            </td>
          </tr></table>
          <div style="background:#0D1B2A;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:11px;color:rgba(201,168,76,.6);font-weight:600;">الموضوع</p>
            <p style="margin:0;font-size:17px;color:#C9A84C;font-weight:700;">$s</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
            <p style="margin:0 0 12px;font-size:11px;color:#9ca3af;font-weight:600;">الرسالة</p>
            <p style="margin:0;font-size:15px;color:#4A5568;line-height:1.8;">$m</p>
          </div>
          <div style="text-align:center;margin-top:32px;">
            <a href="mailto:$e?subject=رد: $s" style="display:inline-block;background:#0D1B2A;color:#C9A84C;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;border:2px solid #C9A84C;">↩ &nbsp; الرد على الرسالة</a>
          </div>
        </td></tr>
        <tr><td style="background:#0D1B2A;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 6px;color:rgba(245,240,232,.45);font-size:12px;">📅 &nbsp; $date</p>
          <p style="margin:0;color:rgba(245,240,232,.3);font-size:11px;">
            تم الإرسال عبر نموذج التواصل في موقع وثيقتي &nbsp;—&nbsp;
            <a href="https://wathi9ati.space" style="color:#C9A84C;text-decoration:none;">wathi9ati.space</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}
