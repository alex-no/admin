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
 * Демо-логи помилок (фейкові дані, процедурно згенеровані в data/fake_analytics.php).
 */
final readonly class AdminErrorLogController
{
    use JsonResponseTrait;

    private const SORTABLE = ['id', 'level', 'category', 'created_at'];
    private const LEVELS   = ['error', 'critical', 'warning', 'alert', 'emergency'];

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/error-logs',
        summary: 'List error logs (fake data)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Error Logs'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 50)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'level', in: 'query', schema: new OA\Schema(type: 'string', enum: self::LEVELS)),
            new OA\Parameter(name: 'date_from', in: 'query', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'date_to', in: 'query', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: self::SORTABLE)),
            new OA\Parameter(name: 'sort_dir', in: 'query', schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated list of error logs'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'logs.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $params  = $request->getQueryParams();
        $page    = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(500, max(1, (int) ($params['per_page'] ?? 50)));

        $conditions = ['1=1'];
        $binds      = [];

        $search = trim((string) ($params['search'] ?? ''));
        if ($search !== '') {
            $conditions[]    = '(message LIKE :search OR exception_class LIKE :search)';
            $binds['search'] = "%$search%";
        }
        if (($params['level'] ?? '') !== '' && in_array($params['level'], self::LEVELS, true)) {
            $conditions[]    = 'level = :level';
            $binds['level']  = $params['level'];
        }
        if (($params['date_from'] ?? '') !== '') {
            $conditions[]       = 'created_at >= :date_from';
            $binds['date_from'] = $params['date_from'] . ' 00:00:00';
        }
        if (($params['date_to'] ?? '') !== '') {
            $conditions[]     = 'created_at <= :date_to';
            $binds['date_to'] = $params['date_to'] . ' 23:59:59';
        }

        $where = 'WHERE ' . implode(' AND ', $conditions);

        $sortBy  = $params['sort_by'] ?? 'created_at';
        $sortDir = strtoupper((string) ($params['sort_dir'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';
        $order   = in_array($sortBy, self::SORTABLE, true) ? "$sortBy $sortDir" : 'created_at DESC';

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM error_logs $where");
        $countStmt->execute($binds);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt   = $this->pdo->prepare("SELECT * FROM error_logs $where ORDER BY $order LIMIT $perPage OFFSET $offset");
        $stmt->execute($binds);

        return $this->json([
            'status' => 'success',
            'data'   => array_map($this->formatListRow(...), $stmt->fetchAll()),
            'pagination' => [
                'page'        => $page,
                'per_page'    => $perPage,
                'total'       => $total,
                'total_pages' => (int) ceil($total / max(1, $perPage)),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/error-logs/{id}',
        summary: 'Get a single error log entry',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Error Logs'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Error log entry'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function show(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'logs.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id  = $this->idFromPath($request);
        $row = $id !== 0 ? $this->fetchRow($id) : null;
        if ($row === null) {
            return $this->json(['status' => 'error', 'message' => 'Error log not found'], 404);
        }

        return $this->json(['status' => 'success', 'data' => $this->formatDetail($row)]);
    }

    #[OA\Delete(
        path: '/api/admin/error-logs/cleanup',
        summary: 'Delete error logs older than N days',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Error Logs'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [new OA\Property(property: 'days', type: 'integer', minimum: 1)])
        ),
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Invalid days'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function cleanup(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'logs.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $data = json_decode((string) $request->getBody(), true) ?? [];
        $days = (int) ($data['days'] ?? 0);
        if ($days < 1) {
            return $this->json(['status' => 'error', 'message' => 'Invalid days'], 400);
        }

        $before = (new \DateTimeImmutable("-$days days"))->format('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare('DELETE FROM error_logs WHERE created_at < :before');
        $stmt->execute(['before' => $before]);
        $deleted = $stmt->rowCount();

        return $this->json([
            'status'  => 'success',
            'message' => "Видалено записів: $deleted",
            'data'    => ['deleted' => $deleted],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/error-logs/stats',
        summary: 'Aggregated error log stats',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Error Logs'],
        parameters: [new OA\Parameter(name: 'days', in: 'query', schema: new OA\Schema(type: 'integer', default: 7))],
        responses: [
            new OA\Response(response: 200, description: 'Aggregated stats'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function stats(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'logs.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $days  = max(1, min(365, (int) ($request->getQueryParams()['days'] ?? 7)));
        $since = (new \DateTimeImmutable("-$days days"))->format('Y-m-d H:i:s');
        $binds = ['since' => $since];

        $q = function (string $sql) use ($binds): \PDOStatement {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($binds);
            return $stmt;
        };

        $total = (int) $q('SELECT COUNT(*) FROM error_logs WHERE created_at >= :since')->fetchColumn();

        return $this->json([
            'status' => 'success',
            'data'   => [
                'total'       => $total,
                'period_days' => $days,
                'by_level'    => $q('SELECT level, COUNT(*) AS count FROM error_logs WHERE created_at >= :since GROUP BY level ORDER BY count DESC')->fetchAll(),
                'by_category' => $q("SELECT category, COUNT(*) AS count FROM error_logs WHERE created_at >= :since AND category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10")->fetchAll(),
                'by_exception' => $q("SELECT exception_class, COUNT(*) AS count FROM error_logs WHERE created_at >= :since AND exception_class IS NOT NULL GROUP BY exception_class ORDER BY count DESC LIMIT 10")->fetchAll(),
                'trend'       => $q('SELECT DATE(created_at) AS date, level, COUNT(*) AS count FROM error_logs WHERE created_at >= :since GROUP BY date, level ORDER BY date')->fetchAll(),
            ],
        ]);
    }

    private function idFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/error-logs/(\d+)$~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function fetchRow(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM error_logs WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private function formatListRow(array $row): array
    {
        return [
            'id'              => (int) $row['id'],
            'level'           => $row['level'],
            'category'        => $row['category'] ?: null,
            'message'         => $row['message'],
            'exception_class' => $row['exception_class'] ?: null,
            'file'            => $row['file'] ?: null,
            'line'            => $row['line'] !== null ? (int) $row['line'] : null,
            'created_at'      => $row['created_at'],
        ];
    }

    private function formatDetail(array $row): array
    {
        $user = null;
        if ($row['user_id'] !== null) {
            $stmt = $this->pdo->prepare('SELECT username FROM users WHERE id = :id');
            $stmt->execute(['id' => $row['user_id']]);
            $user = $stmt->fetch();
        }

        return [
            'id'              => (int) $row['id'],
            'level'           => $row['level'],
            'category'        => $row['category'] ?: null,
            'message'         => $row['message'],
            'exception_class' => $row['exception_class'] ?: null,
            'file'            => $row['file'] ?: null,
            'line'            => $row['line'] !== null ? (int) $row['line'] : null,
            'stack_trace'     => $row['stack_trace'] ?: null,
            'context'         => $row['context'] ? json_decode((string) $row['context'], true) : null,
            'url'             => $row['url'] ?: null,
            'method'          => $row['method'] ?: null,
            'ip'              => $row['ip'] ?: null,
            'user_id'         => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'username'        => $user['username'] ?? null,
            'email'           => $user ? $user['username'] . '@example.com' : null,
            'created_at'      => $row['created_at'],
        ];
    }
}
