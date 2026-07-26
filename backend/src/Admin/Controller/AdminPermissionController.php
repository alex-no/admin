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
 * Демо-каталог прав доступу (RBAC). Тільки перегляд і редагування опису —
 * права створюються/видаляються лише через seed (data/csv/permission.csv).
 * Дані живуть у SQLite, що перестворюється при рестарті контейнера.
 */
final readonly class AdminPermissionController
{
    use JsonResponseTrait;

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/permissions',
        summary: 'List the permission catalog',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Permissions'],
        responses: [
            new OA\Response(response: 200, description: 'List of permissions'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'permission.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stmt = $this->pdo->query('SELECT * FROM permission ORDER BY module, slug');

        return $this->json([
            'status'      => 'success',
            'permissions' => array_map($this->format(...), $stmt->fetchAll()),
        ]);
    }

    #[OA\Put(
        path: '/api/admin/permissions/{id}',
        summary: 'Update permission description',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Permissions'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [new OA\Property(property: 'description', type: 'string')]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Permission updated'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Permission not found'),
        ]
    )]
    public function update(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'permission.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id   = $this->idFromPath($request);
        $data = json_decode((string) $request->getBody(), true) ?? [];

        $stmt = $this->pdo->prepare('UPDATE permission SET description = :description WHERE id = :id');
        $stmt->execute(['description' => $data['description'] ?? null, 'id' => $id]);

        if ($stmt->rowCount() === 0 && !$this->exists($id)) {
            return $this->json(['status' => 'error', 'message' => 'Право доступу не знайдено'], 404);
        }

        $row = $this->pdo->prepare('SELECT * FROM permission WHERE id = :id');
        $row->execute(['id' => $id]);

        return $this->json(['status' => 'success', 'permission' => $this->format($row->fetch())]);
    }

    private function idFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/api/admin/permissions/(\d+)~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function exists(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM permission WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetchColumn() !== false;
    }

    private function format(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'slug'        => $row['slug'],
            'name'        => $row['name'],
            'description' => $row['description'],
            'module'      => $row['module'],
            'is_system'   => (bool) $row['is_system'],
        ];
    }
}
