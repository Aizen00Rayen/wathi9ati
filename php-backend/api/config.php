<?php
// ─── Environment / configuration loader ─────────────────────────────────────
// Mirrors backend/.env.example. Loads a `.env` file from (in order):
//   1. STORAGE_PATH override via server env
//   2. public_html/.env         (one level above this api/ folder)
//   3. api/.env
// Values already present in the real environment (getenv/$_SERVER) win.

if (!function_exists('wathi9ati_load_env')) {
    function wathi9ati_load_env(): array
    {
        static $loaded = null;
        if ($loaded !== null) {
            return $loaded;
        }

        $vars = [];
        $candidates = [
            dirname(__DIR__) . '/.env',   // public_html/.env  (recommended)
            __DIR__ . '/.env',            // api/.env
        ];
        foreach ($candidates as $file) {
            if (is_file($file) && is_readable($file)) {
                foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                    $line = trim($line);
                    if ($line === '' || $line[0] === '#') {
                        continue;
                    }
                    $eq = strpos($line, '=');
                    if ($eq === false) {
                        continue;
                    }
                    $key = trim(substr($line, 0, $eq));
                    $val = trim(substr($line, $eq + 1));
                    // Strip surrounding quotes
                    if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && substr($val, -1) === $val[0]) {
                        $val = substr($val, 1, -1);
                    }
                    if (!array_key_exists($key, $vars)) {
                        $vars[$key] = $val;
                    }
                }
            }
        }

        $loaded = $vars;
        return $loaded;
    }
}

if (!function_exists('env')) {
    function env(string $key, ?string $default = null): ?string
    {
        // Real process environment takes precedence
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return (string) $_SERVER[$key];
        }
        $vars = wathi9ati_load_env();
        if (array_key_exists($key, $vars) && $vars[$key] !== '') {
            return $vars[$key];
        }
        return $default;
    }
}

// ─── Resolved configuration ─────────────────────────────────────────────────

// Storage lives OUTSIDE the web-served frontend files. Default: public_html/storage
// (protected by storage/.htaccess). Override with STORAGE_PATH for a dir above webroot.
if (!defined('STORAGE_PATH')) {
    $storage = env('STORAGE_PATH');
    if (!$storage) {
        $storage = dirname(__DIR__) . '/storage';
    }
    define('STORAGE_PATH', rtrim($storage, '/\\'));
}

if (!defined('DB_PATH')) {
    define('DB_PATH', STORAGE_PATH . '/wathi9ati.db');
}
if (!defined('UPLOAD_PATH')) {
    $up = env('UPLOAD_PATH');
    define('UPLOAD_PATH', $up ? rtrim($up, '/\\') : STORAGE_PATH . '/uploads');
}
if (!defined('SCHEMA_PATH')) {
    define('SCHEMA_PATH', __DIR__ . '/schema.sql');
}

define('JWT_SECRET', env('JWT_SECRET', 'change_this_access_secret_in_production'));
define('JWT_REFRESH_SECRET', env('JWT_REFRESH_SECRET', 'change_this_refresh_secret_in_production'));
define('JWT_EXPIRES_IN', wathi9ati_parse_duration(env('JWT_EXPIRES_IN', '15m')));       // seconds
define('JWT_REFRESH_EXPIRES_IN', wathi9ati_parse_duration(env('JWT_REFRESH_EXPIRES_IN', '7d')));
define('FRONTEND_URL', env('FRONTEND_URL', 'http://localhost:5173'));
define('MAX_FILE_SIZE_MB', (int) env('MAX_FILE_SIZE_MB', '10'));
define('APP_ENV', env('NODE_ENV', env('APP_ENV', 'production')));
define('RESEND_API_KEY', env('RESEND_API_KEY', ''));
define('CONTACT_FROM', env('CONTACT_FROM', 'وثيقتي <noreply@wathi9ati.space>'));
define('CONTACT_TO', env('CONTACT_TO', 'contact@wathi9ati.space'));

// Parse durations like "15m", "7d", "3600" → seconds
function wathi9ati_parse_duration(?string $v): int
{
    if ($v === null || $v === '') {
        return 900;
    }
    if (is_numeric($v)) {
        return (int) $v;
    }
    $unit = strtolower(substr($v, -1));
    $num = (int) substr($v, 0, -1);
    switch ($unit) {
        case 's': return $num;
        case 'm': return $num * 60;
        case 'h': return $num * 3600;
        case 'd': return $num * 86400;
        default:  return (int) $v;
    }
}
