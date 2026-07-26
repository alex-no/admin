<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

namespace App\Admin\Controller;

use App\Admin\Service\AdminAuth;
use App\Admin\Support\JsonResponseTrait;
use OpenApi\Attributes as OA;
use PDO;
use PDOException;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Демо-CRUD для управління ролями (RBAC).
 * Дані — фейкові, з data/csv/{role,permission,role_permission,role_hierarchy}.csv,
 * живуть у SQLite, що перестворюється при рестарті контейнера.
 */
final readonly class AdminRoleController
{
    use JsonResponseTrait;

    private const SLUG_PATTERN = '/^[a-z_]+$/';

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/roles',
        summary: 'List roles with their permissions and parent roles',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        responses: [
            new OA\Response(response: 200, description: 'List of roles'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $roles = $this->pdo->query('SELECT * FROM role ORDER BY id')->fetchAll();

        return $this->json(['status' => 'success', 'roles' => array_map($this->formatRole(...), $roles)]);
    }

    #[OA\Post(
        path: '/api/admin/roles',
        summary: 'Create a role',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['slug', 'name'],
                properties: [
                    new OA\Property(property: 'slug', type: 'string', example: 'content_manager'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'description', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Role created'),
            new OA\Response(response: 400, description: 'Invalid slug/name or slug already exists'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function create(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $data = json_decode((string) $request->getBody(), true) ?? [];
        $slug = trim((string) ($data['slug'] ?? ''));
        $name = trim((string) ($data['name'] ?? ''));

        if (!preg_match(self::SLUG_PATTERN, $slug) || $name === '') {
            return $this->json(['status' => 'error', 'message' => 'Некоректний slug або назва'], 400);
        }

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO role (slug, name, description, is_system) VALUES (:slug, :name, :description, 0)'
            );
            $stmt->execute([
                'slug'        => $slug,
                'name'        => $name,
                'description' => $data['description'] ?? null,
            ]);
        } catch (PDOException) {
            return $this->json(['status' => 'error', 'message' => 'Роль з таким slug вже існує'], 400);
        }

        $id = (int) $this->pdo->lastInsertId();

        return $this->json(['status' => 'success', 'role' => $this->formatRole($this->fetchRole($id))], 201);
    }

    #[OA\Put(
        path: '/api/admin/roles/{id}',
        summary: 'Update role general info',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'slug', type: 'string'),
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'description', type: 'string'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Role updated'),
            new OA\Response(response: 400, description: 'Invalid input / system role slug change'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Role not found'),
        ]
    )]
    public function update(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id   = $this->idFromPath($request);
        $role = $this->fetchRole($id);
        if ($role === false) {
            return $this->json(['status' => 'error', 'message' => 'Роль не знайдена'], 404);
        }

        $data   = json_decode((string) $request->getBody(), true) ?? [];
        $sets   = [];
        $params = ['id' => $id];

        if (array_key_exists('slug', $data)) {
            $slug = trim((string) $data['slug']);
            if ((bool) $role['is_system'] && $slug !== $role['slug']) {
                return $this->json(['status' => 'error', 'message' => 'Системній ролі не можна змінювати slug'], 400);
            }
            if (!preg_match(self::SLUG_PATTERN, $slug)) {
                return $this->json(['status' => 'error', 'message' => 'Некоректний slug'], 400);
            }
            $sets[]         = 'slug = :slug';
            $params['slug'] = $slug;
        }
        if (array_key_exists('name', $data)) {
            $sets[]         = 'name = :name';
            $params['name'] = $data['name'];
        }
        if (array_key_exists('description', $data)) {
            $sets[]                = 'description = :description';
            $params['description'] = $data['description'];
        }

        if ($sets === []) {
            return $this->json(['status' => 'error', 'message' => 'Немає полів для оновлення'], 400);
        }

        try {
            $this->pdo->prepare('UPDATE role SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($params);
        } catch (PDOException) {
            return $this->json(['status' => 'error', 'message' => 'Роль з таким slug вже існує'], 400);
        }

        return $this->json(['status' => 'success', 'role' => $this->formatRole($this->fetchRole($id))]);
    }

    #[OA\Delete(
        path: '/api/admin/roles/{id}',
        summary: 'Delete a non-system role',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Role deleted'),
            new OA\Response(response: 400, description: 'System roles cannot be deleted'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Role not found'),
        ]
    )]
    public function delete(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.delete')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id   = $this->idFromPath($request);
        $role = $this->fetchRole($id);
        if ($role === false) {
            return $this->json(['status' => 'error', 'message' => 'Роль не знайдена'], 404);
        }
        if ((bool) $role['is_system']) {
            return $this->json(['status' => 'error', 'message' => 'Системну роль не можна видалити'], 400);
        }

        $this->pdo->prepare('DELETE FROM role_permission WHERE role_id = :id')->execute(['id' => $id]);
        $this->pdo->prepare('DELETE FROM role_hierarchy WHERE parent_role_id = :id OR child_role_id = :id2')
            ->execute(['id' => $id, 'id2' => $id]);
        $this->pdo->prepare('DELETE FROM user_role WHERE role_id = :id')->execute(['id' => $id]);
        $this->pdo->prepare('DELETE FROM role WHERE id = :id')->execute(['id' => $id]);

        return $this->json(['status' => 'success']);
    }

    #[OA\Post(
        path: '/api/admin/roles/{id}/permissions',
        summary: "Replace a role's permission set",
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'permissions',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'id', type: 'integer'),
                                new OA\Property(property: 'effect', type: 'string', enum: ['allow', 'deny']),
                            ]
                        )
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Permissions replaced'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Role not found'),
        ]
    )]
    public function setPermissions(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id = $this->idFromPath($request);
        if ($this->fetchRole($id) === false) {
            return $this->json(['status' => 'error', 'message' => 'Роль не знайдена'], 404);
        }

        $data        = json_decode((string) $request->getBody(), true) ?? [];
        $permissions = is_array($data['permissions'] ?? null) ? $data['permissions'] : [];

        $this->pdo->prepare('DELETE FROM role_permission WHERE role_id = :id')->execute(['id' => $id]);

        $insert = $this->pdo->prepare(
            'INSERT INTO role_permission (role_id, permission_id, effect) VALUES (:role_id, :permission_id, :effect)'
        );
        foreach ($permissions as $p) {
            $insert->execute([
                'role_id'       => $id,
                'permission_id' => (int) ($p['id'] ?? 0),
                'effect'        => ($p['effect'] ?? 'allow') === 'deny' ? 'deny' : 'allow',
            ]);
        }

        return $this->json(['status' => 'success', 'role' => $this->formatRole($this->fetchRole($id))]);
    }

    #[OA\Post(
        path: '/api/admin/roles/{id}/hierarchy',
        summary: "Replace a role's parent roles",
        security: [['BearerAuth' => []]],
        tags: ['Admin - Roles'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'parent_role_ids', type: 'array', items: new OA\Items(type: 'integer')),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Hierarchy replaced'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Role not found'),
        ]
    )]
    public function setHierarchy(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'role.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id = $this->idFromPath($request);
        if ($this->fetchRole($id) === false) {
            return $this->json(['status' => 'error', 'message' => 'Роль не знайдена'], 404);
        }

        $data      = json_decode((string) $request->getBody(), true) ?? [];
        $parentIds = is_array($data['parent_role_ids'] ?? null) ? $data['parent_role_ids'] : [];

        $this->pdo->prepare('DELETE FROM role_hierarchy WHERE child_role_id = :id')->execute(['id' => $id]);

        $insert = $this->pdo->prepare(
            'INSERT INTO role_hierarchy (parent_role_id, child_role_id) VALUES (:parent_id, :child_id)'
        );
        foreach ($parentIds as $parentId) {
            $parentId = (int) $parentId;
            if ($parentId === $id) {
                continue; // роль не може бути власним батьком
            }
            $insert->execute(['parent_id' => $parentId, 'child_id' => $id]);
        }

        return $this->json(['status' => 'success', 'role' => $this->formatRole($this->fetchRole($id))]);
    }

    private function idFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/api/admin/roles/(\d+)~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function fetchRole(int $id): array|false
    {
        $stmt = $this->pdo->prepare('SELECT * FROM role WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    private function formatRole(array $role): array
    {
        $permStmt = $this->pdo->prepare(
            'SELECT p.id, p.slug, rp.effect
             FROM role_permission rp
             JOIN permission p ON p.id = rp.permission_id
             WHERE rp.role_id = :id
             ORDER BY p.slug'
        );
        $permStmt->execute(['id' => $role['id']]);

        $parentStmt = $this->pdo->prepare(
            'SELECT r.id, r.slug, r.name
             FROM role_hierarchy rh
             JOIN role r ON r.id = rh.parent_role_id
             WHERE rh.child_role_id = :id
             ORDER BY r.name'
        );
        $parentStmt->execute(['id' => $role['id']]);

        return [
            'id'           => (int) $role['id'],
            'slug'         => $role['slug'],
            'name'         => $role['name'],
            'description'  => $role['description'],
            'is_system'    => (bool) $role['is_system'],
            'permissions'  => array_map(static fn (array $p): array => [
                'id'     => (int) $p['id'],
                'slug'   => $p['slug'],
                'effect' => $p['effect'],
            ], $permStmt->fetchAll()),
            'parent_roles' => array_map(static fn (array $r): array => [
                'id'   => (int) $r['id'],
                'slug' => $r['slug'],
                'name' => $r['name'],
            ], $parentStmt->fetchAll()),
        ];
    }
}
