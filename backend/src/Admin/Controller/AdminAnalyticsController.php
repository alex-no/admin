<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

namespace App\Admin\Controller;

use App\Admin\Service\AdminAuth;
use App\Admin\Support\JsonResponseTrait;
use OpenApi\Attributes as OA;
use PDO;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Демо-аналітика відвідувань (фейкові дані, процедурно згенеровані в
 * data/fake_analytics.php — живуть у тій самій SQLite, що й sto/users).
 *
 * Мережеві інструменти (ping/traceroute/geo-IP/blacklist/ban-IP), які показує
 * фронтенд у вкладці "Діагностика" деталей візиту, тут навмисно НЕ реалізовані —
 * це були б реальні мережеві операції проти довільних IP, що не має сенсу
 * (і небезпечно) робити в фейковому демо-бекенді. Кнопки лишаються — вони просто
 * покажуть помилку завантаження, решта сторінки працює повністю.
 */
final readonly class AdminAnalyticsController
{
    use JsonResponseTrait;

    private const SORTABLE = ['id', 'path', 'method', 'status_code', 'ip', 'referer', 'client_type', 'browser', 'user_id', 'response_time', 'created_at'];
    private const METHODS  = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    private const STATUSES = [200, 201, 204, 301, 302, 400, 401, 403, 404, 422, 500, 503];
    private const CLIENT_TYPES = ['human', 'bot', 'suspicious', 'unknown'];

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/analytics/pageviews',
        summary: 'List pageviews (fake analytics data)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 100)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'section', in: 'query', schema: new OA\Schema(type: 'string', enum: ['frontend', 'admin'])),
            new OA\Parameter(name: 'client_type', in: 'query', description: 'Складові значення на кшталт "human_desktop", "bot_search_google" — див. applyClientTypeFilter()', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'device_type', in: 'query', schema: new OA\Schema(type: 'string', enum: ['desktop', 'mobile', 'tablet'])),
            new OA\Parameter(name: 'status_code', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'method', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'date_from', in: 'query', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'date_to', in: 'query', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'ip', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: self::SORTABLE)),
            new OA\Parameter(name: 'sort_dir', in: 'query', schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated list of pageviews'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $params  = $request->getQueryParams();
        $page    = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(500, max(1, (int) ($params['per_page'] ?? 100)));

        [$where, $binds] = $this->buildFilters($params);

        $sortBy  = $params['sort_by'] ?? 'created_at';
        $sortDir = strtoupper((string) ($params['sort_dir'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';
        $order   = in_array($sortBy, self::SORTABLE, true) ? "$sortBy $sortDir" : 'created_at DESC';

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM pageviews $where");
        $countStmt->execute($binds);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt   = $this->pdo->prepare("SELECT * FROM pageviews $where ORDER BY $order LIMIT $perPage OFFSET $offset");
        $stmt->execute($binds);

        return $this->json([
            'status' => 'success',
            'data'   => array_map($this->format(...), $stmt->fetchAll()),
            'pagination' => [
                'page'        => $page,
                'per_page'    => $perPage,
                'total'       => $total,
                'total_pages' => (int) ceil($total / max(1, $perPage)),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/analytics/pageview/{id}',
        summary: 'Get a single pageview',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Pageview'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function show(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id  = $this->idFromPath($request, '~/pageview/(\d+)~');
        $row = $id !== 0 ? $this->fetchRow($id) : null;
        if ($row === null) {
            return $this->json(['status' => 'error', 'message' => 'Pageview not found'], 404);
        }

        return $this->json(['status' => 'success', 'data' => $this->format($row)]);
    }

    #[OA\Patch(
        path: '/api/admin/analytics/pageview/{id}/client-type',
        summary: 'Change client type of a single pageview',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [new OA\Property(property: 'client_type', type: 'string', enum: self::CLIENT_TYPES)])
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Invalid client_type'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function updateClientType(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id   = $this->idFromPath($request, '~/pageview/(\d+)/client-type~');
        $data = json_decode((string) $request->getBody(), true) ?? [];

        if (!in_array($data['client_type'] ?? null, self::CLIENT_TYPES, true)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid client_type'], 400);
        }
        if ($id === 0 || $this->fetchRow($id) === null) {
            return $this->json(['status' => 'error', 'message' => 'Pageview not found'], 404);
        }

        $this->pdo->prepare('UPDATE pageviews SET client_type = :client_type, detection_method = :method WHERE id = :id')
            ->execute(['client_type' => $data['client_type'], 'method' => 'manual', 'id' => $id]);

        return $this->json(['status' => 'success', 'data' => $this->format($this->fetchRow($id))]);
    }

    #[OA\Patch(
        path: '/api/admin/analytics/bulk-update-client-type',
        summary: 'Change client type for multiple pageviews at once',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'ids', type: 'array', items: new OA\Items(type: 'integer')),
                new OA\Property(property: 'client_type', type: 'string', enum: self::CLIENT_TYPES),
            ])
        ),
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Invalid payload'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function bulkUpdateClientType(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $data = json_decode((string) $request->getBody(), true) ?? [];
        $ids  = array_values(array_filter(array_map('intval', (array) ($data['ids'] ?? []))));

        if ($ids === [] || !in_array($data['client_type'] ?? null, self::CLIENT_TYPES, true)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid payload'], 400);
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare("UPDATE pageviews SET client_type = ?, detection_method = 'manual' WHERE id IN ($placeholders)");
        $stmt->execute([$data['client_type'], ...$ids]);

        return $this->json(['status' => 'success', 'data' => ['updated' => $stmt->rowCount()]]);
    }

    #[OA\Post(
        path: '/api/admin/analytics/ban-ip',
        summary: 'Ban an IP address (from the pageview detail "Ban IP" modal)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'ip', type: 'string'),
                new OA\Property(property: 'duration', type: 'string', enum: ['1h', '24h', '15d', '30d', '180d']),
                new OA\Property(property: 'reason', type: 'string'),
                new OA\Property(property: 'delete_analytics', type: 'boolean'),
            ])
        ),
        responses: [
            new OA\Response(response: 200, description: 'Banned'),
            new OA\Response(response: 400, description: 'Invalid payload'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function banIp(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $data   = json_decode((string) $request->getBody(), true) ?? [];
        $ip     = trim((string) ($data['ip'] ?? ''));
        $reason = trim((string) ($data['reason'] ?? ''));

        if (!filter_var($ip, FILTER_VALIDATE_IP) || $reason === '') {
            return $this->json(['status' => 'error', 'message' => 'IP та причина обов\'язкові'], 400);
        }

        $durations = ['1h' => '+1 hour', '24h' => '+24 hours', '15d' => '+15 days', '30d' => '+30 days', '180d' => '+180 days'];
        $duration  = $durations[$data['duration'] ?? '24h'] ?? $durations['24h'];
        $expiresAt = (new \DateTimeImmutable($duration))->format('Y-m-d H:i:s');
        $now       = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        $this->pdo->prepare(
            'INSERT INTO banned_ips (ip, reason, banned_at, expires_at) VALUES (:ip, :reason, :banned_at, :expires_at)
             ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, banned_at = excluded.banned_at, expires_at = excluded.expires_at'
        )->execute(['ip' => $ip, 'reason' => $reason, 'banned_at' => $now, 'expires_at' => $expiresAt]);

        $deletedCount = 0;
        if (!empty($data['delete_analytics'])) {
            $stmt = $this->pdo->prepare('DELETE FROM pageviews WHERE ip = :ip');
            $stmt->execute(['ip' => $ip]);
            $deletedCount = $stmt->rowCount();
        }

        return $this->json(['status' => 'success', 'data' => ['ip' => $ip, 'expires_at' => $expiresAt, 'deleted_count' => $deletedCount]]);
    }

    #[OA\Get(
        path: '/api/admin/analytics/stats',
        summary: 'Aggregated analytics (powers /analytics/stats and /analytics/charts)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(name: 'days', in: 'query', schema: new OA\Schema(type: 'integer', default: 7)),
            new OA\Parameter(name: 'section', in: 'query', schema: new OA\Schema(type: 'string', enum: ['frontend', 'admin'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Aggregated stats'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function stats(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $params = $request->getQueryParams();
        $days   = max(1, min(365, (int) ($params['days'] ?? 7)));
        $since  = (new \DateTimeImmutable("-$days days"))->format('Y-m-d H:i:s');

        $where  = 'WHERE created_at >= :since';
        $binds  = ['since' => $since];
        if (($params['section'] ?? '') !== '' && in_array($params['section'], ['frontend', 'admin'], true)) {
            $where .= ' AND section = :section';
            $binds['section'] = $params['section'];
        }

        $q = function (string $sql) use ($binds): \PDOStatement {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($binds);
            return $stmt;
        };

        $total = (int) $q("SELECT COUNT(*) FROM pageviews $where")->fetchColumn();

        return $this->json([
            'status' => 'success',
            'data'   => [
                'total'          => $total,
                'period_days'    => $days,
                'unique_visitors' => (int) $q("SELECT COUNT(DISTINCT ip) FROM pageviews $where AND is_bot = 0")->fetchColumn(),
                'response_time'  => $q("SELECT ROUND(AVG(response_time), 1) AS avg_time, MAX(response_time) AS max_time FROM pageviews $where")->fetch(),
                'top_pages'      => $q("SELECT path, COUNT(*) AS views FROM pageviews $where GROUP BY path ORDER BY views DESC LIMIT 10")->fetchAll(),
                'top_referers'   => $q("SELECT referer, COUNT(*) AS count FROM pageviews $where AND referer IS NOT NULL AND referer != '' GROUP BY referer ORDER BY count DESC LIMIT 10")->fetchAll(),
                'by_device'      => $q("SELECT device_type, COUNT(*) AS count FROM pageviews $where AND device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC")->fetchAll(),
                'by_browser'     => $q("SELECT browser, COUNT(*) AS count FROM pageviews $where AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC")->fetchAll(),
                'by_os'          => $q("SELECT os, COUNT(*) AS count FROM pageviews $where AND os IS NOT NULL GROUP BY os ORDER BY count DESC")->fetchAll(),
                'by_client_type' => $q("SELECT client_type, COUNT(*) AS count FROM pageviews $where GROUP BY client_type ORDER BY count DESC")->fetchAll(),
                'bot_categories' => $q("SELECT bot_category, COUNT(*) AS count FROM pageviews $where AND bot_category IS NOT NULL GROUP BY bot_category ORDER BY count DESC")->fetchAll(),
                'top_bots'       => $q("SELECT bot_name, COUNT(*) AS count FROM pageviews $where AND bot_name IS NOT NULL GROUP BY bot_name ORDER BY count DESC LIMIT 10")->fetchAll(),
                'bots_vs_real'   => $q("SELECT is_bot, COUNT(*) AS count FROM pageviews $where GROUP BY is_bot")->fetchAll(),
                'trend'          => $q("SELECT DATE(created_at) AS date, is_bot, COUNT(*) AS count FROM pageviews $where GROUP BY date, is_bot ORDER BY date")->fetchAll(),
                'hourly'         => $q("SELECT CAST(strftime('%H', created_at) AS INTEGER) AS hour, COUNT(*) AS count FROM pageviews $where GROUP BY hour ORDER BY hour")->fetchAll(),
            ],
        ]);
    }

    /** @return array{0: string, 1: array<string, mixed>} */
    private function buildFilters(array $params): array
    {
        $conditions = ['1=1'];
        $binds      = [];

        $search = trim((string) ($params['search'] ?? ''));
        if ($search !== '') {
            $conditions[]    = 'path LIKE :search';
            $binds['search'] = "%$search%";
        }
        if (($params['section'] ?? '') !== '' && in_array($params['section'], ['frontend', 'admin'], true)) {
            $conditions[]      = 'section = :section';
            $binds['section']  = $params['section'];
        }
        if (($params['device_type'] ?? '') !== '' && in_array($params['device_type'], ['desktop', 'mobile', 'tablet'], true)) {
            $conditions[]          = 'device_type = :device_type';
            $binds['device_type']  = $params['device_type'];
        }
        if (($params['date_from'] ?? '') !== '') {
            $conditions[]         = 'created_at >= :date_from';
            $binds['date_from']   = $params['date_from'] . ' 00:00:00';
        }
        if (($params['date_to'] ?? '') !== '') {
            $conditions[]       = 'created_at <= :date_to';
            $binds['date_to']   = $params['date_to'] . ' 23:59:59';
        }
        if (($params['ip'] ?? '') !== '') {
            $conditions[]  = 'ip = :ip';
            $binds['ip']   = $params['ip'];
        }

        if (($params['status_code'] ?? '') !== '') {
            if ($params['status_code'] === 'other') {
                // Значення з фіксованої константи (не з довільного вводу) — безпечно вбудувати літералом.
                $conditions[] = 'status_code NOT IN (' . implode(',', self::STATUSES) . ')';
            } elseif (ctype_digit((string) $params['status_code'])) {
                $conditions[]         = 'status_code = :status_code';
                $binds['status_code'] = (int) $params['status_code'];
            }
        }

        if (($params['method'] ?? '') !== '') {
            if ($params['method'] === 'other') {
                $conditions[] = "method NOT IN ('" . implode("','", self::METHODS) . "')";
            } elseif (in_array($params['method'], self::METHODS, true)) {
                $conditions[]        = 'method = :method';
                $binds['method']     = $params['method'];
            }
        }

        $clientTypeCondition = $this->clientTypeCondition((string) ($params['client_type'] ?? ''));
        if ($clientTypeCondition !== null) {
            $conditions[] = $clientTypeCondition;
        }

        return ['WHERE ' . implode(' AND ', $conditions), $binds];
    }

    /**
     * Фільтр "Тип клієнта" на фронтенді — це один select зі складеними значеннями
     * (напр. "human_desktop", "bot_search_google", "bot_bad_unknown"), а не просто
     * client_type. Значення фіксовані (з фронтенд-конфігу, не з довільного вводу
     * користувача), тому тут безпечно збирати SQL напряму, без bind-параметрів.
     */
    private function clientTypeCondition(string $value): ?string
    {
        if ($value === '') {
            return null;
        }
        if ($value === 'unclassified') {
            return "(client_type IS NULL OR client_type = '')";
        }
        if (in_array($value, ['human', 'suspicious', 'unknown'], true)) {
            return "client_type = '$value'";
        }
        if (in_array($value, ['human_desktop', 'human_mobile', 'human_tablet'], true)) {
            $device = substr($value, strlen('human_'));
            return "client_type = 'human' AND device_type = '$device'";
        }
        if ($value === 'human_unknown') {
            return "client_type = 'human' AND (device_type IS NULL OR device_type = '')";
        }
        if ($value === 'bot_search_engine') {
            return "client_type = 'bot' AND bot_category = 'search_engine'";
        }
        if ($value === 'bot_search_google') {
            return "client_type = 'bot' AND bot_category = 'search_engine' AND bot_name LIKE '%Google%'";
        }
        if ($value === 'bot_search_yandex') {
            return "client_type = 'bot' AND bot_category = 'search_engine' AND bot_name LIKE '%Yandex%'";
        }
        if ($value === 'bot_search_bing') {
            return "client_type = 'bot' AND bot_category = 'search_engine' AND bot_name LIKE '%ing%'";
        }
        if ($value === 'bot_search_other') {
            return "client_type = 'bot' AND bot_category = 'search_engine' AND bot_name NOT LIKE '%Google%' AND bot_name NOT LIKE '%Yandex%' AND bot_name NOT LIKE '%ing%'";
        }
        if ($value === 'bot_search_unknown') {
            return "client_type = 'bot' AND bot_category = 'search_engine' AND (bot_name IS NULL OR bot_name = '')";
        }
        if ($value === 'bot_seo_tool') {
            return "client_type = 'bot' AND bot_category = 'seo_tool'";
        }
        if ($value === 'bot_seo_unknown') {
            return "client_type = 'bot' AND bot_category = 'seo_tool' AND (bot_name IS NULL OR bot_name = '')";
        }
        if ($value === 'bot_monitoring') {
            return "client_type = 'bot' AND bot_category = 'monitoring'";
        }
        if ($value === 'bot_monitoring_unknown') {
            return "client_type = 'bot' AND bot_category = 'monitoring' AND (bot_name IS NULL OR bot_name = '')";
        }
        if ($value === 'bot_scraper') {
            return "client_type = 'bot' AND bot_category = 'scraper'";
        }
        if ($value === 'bot_malicious') {
            return "client_type = 'bot' AND bot_category = 'malicious'";
        }
        if ($value === 'bot_bad_unknown') {
            return "client_type = 'bot' AND (bot_category IS NULL OR bot_category = '')";
        }

        return null;
    }

    private function idFromPath(ServerRequestInterface $request, string $pattern): int
    {
        preg_match($pattern, $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function fetchRow(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM pageviews WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private function format(array $row): array
    {
        $user = null;
        if ($row['user_id'] !== null) {
            $stmt = $this->pdo->prepare('SELECT username, name FROM users WHERE id = :id');
            $stmt->execute(['id' => $row['user_id']]);
            $user = $stmt->fetch();
        }

        return [
            'id'               => (int) $row['id'],
            'created_at'       => $row['created_at'],
            'section'          => $row['section'],
            'url'              => $row['url'],
            'path'             => $row['path'],
            'method'           => $row['method'],
            'status_code'      => (int) $row['status_code'],
            'response_time'    => (int) $row['response_time'],
            'ip'               => $row['ip'],
            'referer'          => $row['referer'] ?: null,
            'client_type'      => $row['client_type'] ?: null,
            'detection_method' => $row['detection_method'] ?: null,
            'is_bot'           => (bool) $row['is_bot'],
            'device_type'      => $row['device_type'] ?: null,
            'browser'          => $row['browser'] ?: null,
            'os'               => $row['os'] ?: null,
            'bot_name'         => $row['bot_name'] ?: null,
            'bot_category'     => $row['bot_category'] ?: null,
            'user_agent'       => $row['user_agent'] ?: null,
            'user_id'          => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'username'         => $user['username'] ?? null,
            'email'            => $user ? $user['username'] . '@example.com' : null,
            'session_id'       => $row['session_id'],
        ];
    }
}
