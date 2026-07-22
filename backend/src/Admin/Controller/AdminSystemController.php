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
 * Приклад read-only "службового" ендпоінту без наворотів —
 * під віджет SystemHealthWidget.vue (меню "Система > Моніторинг").
 *
 * Тут немає ні MySQL, ні MinIO (фейковий бекенд на SQLite+CSV), тому
 * "database"/"storage" — правдоподобні, але не справжні метрики;
 * server.* (диск, load average, пам'ять) — реальні значення контейнера.
 */
final readonly class AdminSystemController
{
    use JsonResponseTrait;

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/system/metrics',
        summary: 'System health metrics',
        description: 'server.* — реальні дані контейнера; database/storage/errors — фейкові (немає MySQL/MinIO у цьому бекенді)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - System'],
        responses: [
            new OA\Response(response: 200, description: 'Current metrics'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function metrics(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'system.monitoring.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        return $this->json([
            'status' => 'success',
            'data'   => [
                'server'   => $this->serverStats(),
                'database' => $this->databaseStats(),
                'storage'  => ['reachable' => true, 'file_count' => 0, 'total_mb' => 0.0],
                'errors'   => ['last_hour' => 0, 'last_24h' => 0],
            ],
        ]);
    }

    private function serverStats(): array
    {
        $total = @disk_total_space('/');
        $free  = @disk_free_space('/');
        $diskPercent = ($total && $free !== false) ? round((1 - $free / $total) * 100, 1) : null;

        $memPercent = null;
        $meminfo = @file_get_contents('/proc/meminfo');
        if ($meminfo && preg_match('/MemTotal:\s+(\d+)/', $meminfo, $mTotal)
            && preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $mAvail)) {
            $memTotal = (int) $mTotal[1];
            $memAvail = (int) $mAvail[1];
            $memPercent = $memTotal > 0 ? round((1 - $memAvail / $memTotal) * 100, 1) : null;
        }

        return [
            'disk_usage_percent' => $diskPercent,
            'load_average'       => function_exists('sys_getloadavg') ? sys_getloadavg() : null,
            'memory'             => ['usage_percent' => $memPercent],
        ];
    }

    private function databaseStats(): array
    {
        $dbPath = dirname(__DIR__, 3) . '/runtime/fake.sqlite';

        return [
            // SQLite — не клієнт-серверна БД, "з'єднання"/"повільні запити" тут умовні
            'connections'  => 1,
            'slow_queries' => 0,
            'size_mb'      => file_exists($dbPath) ? round(filesize($dbPath) / 1024 / 1024, 2) : 0.0,
        ];
    }
}
