<?php

declare(strict_types=1);

namespace App\Admin\Controller;

use App\Admin\Service\AdminAuth;
use App\Admin\Support\JsonResponseTrait;
use OpenApi\Attributes as OA;
use PDO;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Демо-CRUD для довідки "Реєстр даних" на фронтенді.
 * Дані — фейкові, з data/csv/sto.csv, живуть у SQLite, що перестворюється при рестарті контейнера.
 */
final readonly class AdminStoController
{
    use JsonResponseTrait;

    private const SORTABLE = ['id', 'name_uk', 'sto_type', 'rating', 'is_active'];
    private const TYPES    = ['service', 'tire', 'wash'];
    private const EDITABLE = ['name_uk', 'sto_type', 'is_active', 'address', 'main_phone', 'rating'];

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/sto',
        summary: 'List STOs (fake data)',
        description: 'Демо-ендпоінт списку каркасу list-framework: пейджинг, сортування, фільтри',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 20)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sto_type', in: 'query', schema: new OA\Schema(type: 'string', enum: self::TYPES)),
            new OA\Parameter(name: 'status', in: 'query', schema: new OA\Schema(type: 'string', enum: ['active', 'inactive'])),
            new OA\Parameter(name: 'country_id', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'sort_by', in: 'query', schema: new OA\Schema(type: 'string', enum: self::SORTABLE)),
            new OA\Parameter(name: 'sort_dir', in: 'query', schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated list of STOs'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $params  = $request->getQueryParams();
        $page    = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(200, max(1, (int) ($params['per_page'] ?? 20)));
        $search  = trim((string) ($params['search'] ?? ''));

        $sortBy  = $params['sort_by'] ?? null;
        $sortDir = strtoupper((string) ($params['sort_dir'] ?? 'ASC')) === 'DESC' ? 'DESC' : 'ASC';
        $order   = in_array($sortBy, self::SORTABLE, true) ? "$sortBy $sortDir" : 'id ASC';

        $conditions = ['1=1'];
        $binds      = [];

        if ($search !== '') {
            $conditions[]    = 'name_uk LIKE :search';
            $binds['search'] = "%$search%";
        }
        if (($params['sto_type'] ?? '') !== '' && in_array($params['sto_type'], self::TYPES, true)) {
            $conditions[]      = 'sto_type = :sto_type';
            $binds['sto_type'] = $params['sto_type'];
        }
        if (($params['status'] ?? '') === 'active') {
            $conditions[] = 'is_active = 1';
        } elseif (($params['status'] ?? '') === 'inactive') {
            $conditions[] = 'is_active = 0';
        }
        if (($params['country_id'] ?? '') !== '') {
            $conditions[]        = 'country_id = :country_id';
            $binds['country_id'] = (int) $params['country_id'];
        }

        $where = 'WHERE ' . implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM sto $where");
        $countStmt->execute($binds);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt   = $this->pdo->prepare("SELECT * FROM sto $where ORDER BY $order LIMIT $perPage OFFSET $offset");
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

    #[OA\Patch(
        path: '/api/admin/sto/{id}',
        summary: 'Update STO field(s)',
        description: 'Часткове оновлення (inline-редагування у таблиці на фронтенді) — приймає будь-яку підмножину полів',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name_uk', type: 'string'),
                    new OA\Property(property: 'sto_type', type: 'string', enum: self::TYPES),
                    new OA\Property(property: 'is_active', type: 'boolean'),
                    new OA\Property(property: 'address', type: 'string'),
                    new OA\Property(property: 'main_phone', type: 'string'),
                    new OA\Property(property: 'rating', type: 'number', format: 'float'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'STO updated'),
            new OA\Response(response: 400, description: 'Invalid id / no fields to update'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'STO not found'),
        ]
    )]
    public function update(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id = $this->idFromPath($request);
        if ($id === 0) {
            return $this->json(['status' => 'error', 'message' => 'Invalid id'], 400);
        }

        $data = json_decode((string) $request->getBody(), true) ?? [];
        $sets = [];
        $params = ['id' => $id];

        foreach (self::EDITABLE as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $sets[]         = "$field = :$field";
            $params[$field] = $field === 'is_active' ? (int) (bool) $data[$field] : $data[$field];
        }

        if ($sets === []) {
            return $this->json(['status' => 'error', 'message' => 'No fields to update'], 400);
        }

        $stmt = $this->pdo->prepare('UPDATE sto SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($params);

        if ($stmt->rowCount() === 0 && !$this->exists($id)) {
            return $this->json(['status' => 'error', 'message' => 'STO not found'], 404);
        }

        $row = $this->fetchRow($id);

        return $this->json(['status' => 'success', 'data' => $this->format($row)]);
    }

    #[OA\Delete(
        path: '/api/admin/sto/{id}',
        summary: 'Delete STO',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'STO not found'),
        ]
    )]
    public function delete(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.delete')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id = $this->idFromPath($request);
        if ($id === 0 || !$this->exists($id)) {
            return $this->json(['status' => 'error', 'message' => 'STO not found'], 404);
        }

        $this->pdo->prepare('DELETE FROM sto WHERE id = :id')->execute(['id' => $id]);

        return $this->json(['status' => 'success']);
    }

    private function idFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/api/admin/sto/(\d+)$~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function exists(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM sto WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetchColumn() !== false;
    }

    private function fetchRow(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM sto WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    private function format(array $row): array
    {
        return [
            'id'         => (int) $row['id'],
            'sto_type'   => $row['sto_type'],
            'name_uk'    => $row['name_uk'],
            'address'    => $row['address'],
            'main_phone' => $row['main_phone'],
            'rating'     => $row['rating'] !== null ? (float) $row['rating'] : null,
            'is_active'  => (bool) $row['is_active'],
            'country_id' => $row['country_id'] !== null ? (int) $row['country_id'] : null,
        ];
    }
}
