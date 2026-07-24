<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

/**
 * Процедурна генерація фейкових pageviews/error_logs для демо-аналітики
 * (AdminAnalyticsController/AdminErrorLogController). На відміну від sto/geography/users
 * (стабільні CSV-фікстури), тут природньо великий часовий випадковий набір даних —
 * тому генерується кодом при кожному рестарті контейнера, а не тримається у CSV.
 */

function fakePick(array $weighted): string
{
    $total = array_sum($weighted);
    $r = mt_rand(1, $total);
    foreach ($weighted as $value => $weight) {
        $r -= $weight;
        if ($r <= 0) {
            return (string) $value;
        }
    }
    return (string) array_key_first($weighted);
}

function fakeIp(): string
{
    // 10% — приватні (щоб було що показати як "локальна мережа" у демо), 90% — публічні на вигляд
    if (mt_rand(1, 10) === 1) {
        return '192.168.' . mt_rand(0, 255) . '.' . mt_rand(1, 254);
    }
    return mt_rand(1, 223) . '.' . mt_rand(0, 255) . '.' . mt_rand(0, 255) . '.' . mt_rand(1, 254);
}

function seedPageviewsAndErrorLogs(PDO $pdo): void
{
    seedPageviews($pdo);
    seedErrorLogs($pdo);
}

function seedPageviews(PDO $pdo): void
{
    $frontendPaths = [
        '/', '/sto', '/sto/1', '/sto/2', '/sto/3', '/search?q=шиномонтаж',
        '/search?q=автомийка+київ', '/booking/12', '/booking/45', '/reviews',
        '/about', '/contacts', '/city/kyiv', '/city/lviv', '/service/oil-change',
        '/service/tire-fitting', '/sto/7/reviews',
    ];
    $adminPaths = [
        '/api/admin/auth/login', '/api/admin/auth/me', '/api/admin/sto',
        '/api/admin/sto/3', '/api/admin/users', '/api/admin/geography/countries',
        '/api/admin/analytics/pageviews', '/data-registry', '/dashboard', '/users',
    ];

    $referers = [
        null, null, null, null, // ~40% без referer
        'https://www.google.com/search?q=сто+київ',
        'https://www.google.com/search?q=шиномонтаж',
        'https://www.facebook.com/',
        'https://www.instagram.com/',
        'https://t.me/',
        'https://yandex.ua/search/?text=автосервіс',
        'https://admin.4n.com.ua/dashboard',
        'https://sto.4n.com.ua/',
    ];

    $browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    $desktopOs = ['Windows', 'macOS', 'Linux'];
    $mobileOs  = ['Android', 'iOS'];

    $botsByCategory = [
        'search_engine' => ['Googlebot', 'Bingbot', 'YandexBot', 'DuckDuckBot', 'Baiduspider', 'facebookexternalhit'],
        'seo_tool'      => ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        'monitoring'    => ['UptimeRobot', 'Pingdom', 'StatusCake', 'NewRelicPinger'],
        'scraper'       => ['python-requests', 'Scrapy', 'curl', 'Go-http-client'],
        'malicious'     => ['sqlmap', 'Nikto', 'masscan', 'ZmEu', 'WPScan'],
    ];
    $botCategoryWeights = ['search_engine' => 40, 'seo_tool' => 20, 'monitoring' => 15, 'scraper' => 15, 'malicious' => 10];

    $stmt = $pdo->prepare(<<<SQL
        INSERT INTO pageviews
            (id, created_at, section, url, path, method, status_code, response_time, ip, referer,
             client_type, detection_method, is_bot, device_type, browser, os, bot_name, bot_category,
             user_agent, user_id, session_id)
        VALUES
            (:id, :created_at, :section, :url, :path, :method, :status_code, :response_time, :ip, :referer,
             :client_type, :detection_method, :is_bot, :device_type, :browser, :os, :bot_name, :bot_category,
             :user_agent, :user_id, :session_id)
        SQL);

    $id  = 0;
    $now = new DateTimeImmutable('now');

    // Тисячі окремих execute() без транзакції — це тисячі fsync по одному на SQLite
    // (повільно і на деяких докер-бекендах файлової системи призводило до "readonly
    // database" під час сідування) — тому весь генератор виконується в одній транзакції.
    $pdo->beginTransaction();

    for ($daysAgo = 89; $daysAgo >= 0; $daysAgo--) {
        $dayStart = $now->modify("-$daysAgo days")->setTime(0, 0, 0);
        $rowsToday = mt_rand(25, 45);

        for ($i = 0; $i < $rowsToday; $i++) {
            $id++;

            $section = fakePick(['frontend' => 70, 'admin' => 30]);
            $path = $section === 'frontend'
                ? $frontendPaths[array_rand($frontendPaths)]
                : $adminPaths[array_rand($adminPaths)];

            $method = fakePick(['GET' => 80, 'POST' => 12, 'PUT' => 3, 'PATCH' => 2, 'DELETE' => 3]);
            $statusCode = (int) fakePick([
                200 => 65, 201 => 3, 204 => 2, 301 => 3, 302 => 2,
                400 => 3, 401 => 2, 403 => 1, 404 => 10, 422 => 2, 500 => 4, 503 => 1,
            ]);
            $responseTime = $statusCode >= 500 ? mt_rand(400, 3000) : (int) round(mt_rand(15, 60) ** 1.5);

            $clientType = fakePick(['human' => 55, 'bot' => 38, 'suspicious' => 4, 'unknown' => 3]);
            $isBot = $clientType === 'bot' ? 1 : 0;

            $deviceType = $browser = $os = $botName = $botCategory = $detectionMethod = null;

            if ($clientType === 'human') {
                $detectionMethod = 'user_agent';
                $deviceType = fakePick(['desktop' => 55, 'mobile' => 35, 'tablet' => 10]);
                $browser = $browsers[array_rand($browsers)];
                $os = $deviceType === 'desktop' ? $desktopOs[array_rand($desktopOs)] : $mobileOs[array_rand($mobileOs)];
            } elseif ($clientType === 'bot') {
                $detectionMethod = 'user_agent';
                $botCategory = fakePick($botCategoryWeights);
                $names = $botsByCategory[$botCategory];
                $botName = $names[array_rand($names)];
            } elseif ($clientType === 'suspicious') {
                $detectionMethod = 'heuristic';
            }

            $userAgent = match (true) {
                $clientType === 'bot' => "$botName/2.0 (+https://example.com/bot)",
                $clientType === 'human' => "Mozilla/5.0 ($os) $browser/120.0",
                default => 'Mozilla/5.0 (compatible)',
            };

            $userId = null;
            if ($clientType === 'human' && mt_rand(1, 100) <= 25) {
                $userId = mt_rand(1, 2); // існуючі демо-юзери (admin/manager)
            }

            $createdAt = $dayStart
                ->setTime(mt_rand(0, 23), mt_rand(0, 59), mt_rand(0, 59))
                ->format('Y-m-d H:i:s');

            $stmt->execute([
                'id'               => $id,
                'created_at'       => $createdAt,
                'section'          => $section,
                'url'              => 'https://sto.4n.com.ua' . $path,
                'path'             => $path,
                'method'           => $method,
                'status_code'      => $statusCode,
                'response_time'    => $responseTime,
                'ip'               => fakeIp(),
                'referer'          => $referers[array_rand($referers)],
                'client_type'      => $clientType,
                'detection_method' => $detectionMethod,
                'is_bot'           => $isBot,
                'device_type'      => $deviceType,
                'browser'          => $browser,
                'os'               => $os,
                'bot_name'         => $botName,
                'bot_category'     => $botCategory,
                'user_agent'       => $userAgent,
                'user_id'          => $userId,
                'session_id'       => bin2hex(random_bytes(8)),
            ]);
        }
    }

    $pdo->commit();
}

function seedErrorLogs(PDO $pdo): void
{
    $categories = ['sto', 'auth', 'geography', 'system', 'database', 'api', 'analytics'];

    $errorTemplates = [
        ['level' => 'error',     'exception' => 'PDOException',                 'message' => 'SQLSTATE[HY000]: General error: database is locked'],
        ['level' => 'error',     'exception' => 'TypeError',                    'message' => 'Argument #1 ($id) must be of type int, string given'],
        ['level' => 'error',     'exception' => 'RuntimeException',             'message' => 'Unable to connect to storage backend'],
        ['level' => 'warning',   'exception' => null,                           'message' => 'Deprecated: implicit conversion from float to int'],
        ['level' => 'warning',   'exception' => null,                           'message' => 'Slow query detected (>1000ms)'],
        ['level' => 'critical',  'exception' => 'Yiisoft\\Db\\Exception\\Exception', 'message' => 'Connection to database lost'],
        ['level' => 'error',     'exception' => 'InvalidArgumentException',     'message' => 'Invalid value for field "sto_type"'],
        ['level' => 'alert',     'exception' => 'RuntimeException',             'message' => 'Disk usage above 90% threshold'],
        ['level' => 'emergency', 'exception' => 'RuntimeException',             'message' => 'Application failed to boot: missing configuration'],
        ['level' => 'error',     'exception' => 'JsonException',                'message' => 'Syntax error while decoding request body'],
        ['level' => 'warning',   'exception' => null,                           'message' => 'Rate limit approaching for IP'],
        ['level' => 'error',     'exception' => 'League\\OpenApiValidator\\ValidationException', 'message' => 'Response body does not match schema'],
    ];

    $files = [
        '/var/www/html/src/Admin/Controller/AdminStoController.php',
        '/var/www/html/src/Admin/Controller/AdminAuthController.php',
        '/var/www/html/src/Admin/Service/AdminAuth.php',
        '/var/www/html/vendor/yiisoft/db-sqlite/src/Connection.php',
        '/var/www/html/src/Admin/Controller/AdminGeographyController.php',
    ];

    $adminPaths = ['/api/admin/sto', '/api/admin/auth/login', '/api/admin/users', '/api/admin/geography/countries'];

    $stmt = $pdo->prepare(<<<SQL
        INSERT INTO error_logs
            (id, created_at, level, category, message, exception_class, file, line, stack_trace, context, url, method, ip, user_id)
        VALUES
            (:id, :created_at, :level, :category, :message, :exception_class, :file, :line, :stack_trace, :context, :url, :method, :ip, :user_id)
        SQL);

    $id  = 0;
    $now = new DateTimeImmutable('now');

    $pdo->beginTransaction();

    for ($daysAgo = 89; $daysAgo >= 0; $daysAgo--) {
        $dayStart = $now->modify("-$daysAgo days")->setTime(0, 0, 0);
        $rowsToday = mt_rand(1, 8);

        for ($i = 0; $i < $rowsToday; $i++) {
            $id++;

            $tpl = $errorTemplates[array_rand($errorTemplates)];
            $category = $categories[array_rand($categories)];
            $file = $files[array_rand($files)];
            $line = mt_rand(15, 320);
            $path = $adminPaths[array_rand($adminPaths)];

            $stackTrace = "#0 $file($line): App\\handle()\n"
                . "#1 /var/www/html/public/index.php(59): Application->run()\n"
                . '#2 {main}';

            $createdAt = $dayStart
                ->setTime(mt_rand(0, 23), mt_rand(0, 59), mt_rand(0, 59))
                ->format('Y-m-d H:i:s');

            $stmt->execute([
                'id'              => $id,
                'created_at'      => $createdAt,
                'level'           => $tpl['level'],
                'category'        => $category,
                'message'         => $tpl['message'],
                'exception_class' => $tpl['exception'],
                'file'            => $tpl['exception'] ? $file : null,
                'line'            => $tpl['exception'] ? $line : null,
                'stack_trace'     => $tpl['exception'] ? $stackTrace : null,
                'context'         => json_encode(['path' => $path, 'category' => $category], JSON_UNESCAPED_UNICODE),
                'url'             => 'https://admin.4n.com.ua' . $path,
                'method'          => fakePick(['GET' => 60, 'POST' => 25, 'PATCH' => 10, 'DELETE' => 5]),
                'ip'              => fakeIp(),
                'user_id'         => mt_rand(1, 100) <= 30 ? mt_rand(1, 2) : null,
            ]);
        }
    }

    $pdo->commit();
}
