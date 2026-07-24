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
 * Демо-CRUD для довідки "Реєстр даних" на фронтенді.
 * Дані — фейкові, з data/csv/sto.csv, живуть у SQLite, що перестворюється при рестарті контейнера.
 */
final readonly class AdminStoController
{
    use JsonResponseTrait;

    private const SORTABLE = ['id', 'name_uk', 'sto_type', 'rating', 'is_active', 'phones'];
    private const TYPES    = ['service', 'tire', 'wash'];
    private const EDITABLE = ['name_uk', 'sto_type', 'is_active', 'address', 'phones', 'rating', 'description'];

    // Ті самі підписи, що і в options списку "sto_type" на фронтенді
    // (sto-registry.columns.json) — sto_type зберігається кодом (service/tire/wash),
    // але сортувати треба за словом, яке користувач бачить у таблиці, а не за кодом.
    private const TYPE_LABELS = [
        'service' => 'СТО',
        'tire'    => 'Шиномонтаж',
        'wash'    => 'Автомийка',
    ];

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
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 50)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sto_type', in: 'query', schema: new OA\Schema(type: 'string', enum: self::TYPES)),
            new OA\Parameter(name: 'status', in: 'query', schema: new OA\Schema(type: 'string', enum: ['active', 'inactive'])),
            new OA\Parameter(name: 'country_id', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(
                name: 'sort_by',
                in: 'query',
                description: 'Можна декілька полів через кому, порядок = пріоритет сортування (напр. "sto_type,name_uk")',
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'sort_dir',
                in: 'query',
                description: 'Напрямок для кожного поля з sort_by, у тому ж порядку, через кому (напр. "ASC,DESC")',
                schema: new OA\Schema(type: 'string')
            ),
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
        $perPage = min(250, max(1, (int) ($params['per_page'] ?? 50)));
        $search  = trim((string) ($params['search'] ?? ''));

        $order = $this->buildOrderClause((string) ($params['sort_by'] ?? ''), (string) ($params['sort_dir'] ?? ''));

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

    #[OA\Get(
        path: '/api/admin/sto/{id}',
        summary: 'Get a single STO by id',
        description: 'Використовується для прямого відкриття деталей за посиланням (id зберігається в URL сторінки)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'STO'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'STO not found'),
        ]
    )]
    public function show(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $id = $this->idFromPath($request);
        if ($id === 0 || !$this->exists($id)) {
            return $this->json(['status' => 'error', 'message' => 'STO not found'], 404);
        }

        return $this->json(['status' => 'success', 'data' => $this->format($this->fetchRow($id))]);
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
                    new OA\Property(property: 'phones', type: 'array', items: new OA\Items(type: 'string'), example: ['+380441234567', '+380441234568']),
                    new OA\Property(property: 'rating', type: 'number', format: 'float'),
                    new OA\Property(property: 'description', type: 'string'),
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
            $sets[] = "$field = :$field";

            if ($field === 'is_active') {
                $params[$field] = (int) (bool) $data[$field];
            } elseif ($field === 'phones') {
                // У БД (і CSV) декілька номерів зберігаються одним рядком через ";" —
                // у API/формі це завжди звичайний масив рядків.
                $phones = array_filter(array_map('trim', (array) $data[$field]), static fn ($p) => $p !== '');
                $params[$field] = implode(';', $phones);
            } else {
                $params[$field] = $data[$field];
            }
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

    /**
     * Будує ORDER BY одразу по декількох полях (мульти-сортування з фронтенду:
     * Ctrl+клік по заголовку додає колонку до вже вибраних). $sortBy і $sortDir —
     * список полів/напрямків через кому, в одному й тому ж порядку.
     */
    private function buildOrderClause(string $sortBy, string $sortDir): string
    {
        $keys = array_filter(array_map('trim', explode(',', $sortBy)), static fn ($k) => $k !== '');
        $dirs = array_map('trim', explode(',', $sortDir));

        $parts = [];
        foreach (array_values($keys) as $i => $key) {
            if (!in_array($key, self::SORTABLE, true)) {
                continue;
            }
            $dir = strtoupper($dirs[$i] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
            $parts[] = $this->sortExpr($key) . " $dir";
        }

        return $parts !== [] ? implode(', ', $parts) : 'id ASC';
    }

    /**
     * sto_type зберігається кодом (service/tire/wash) — сортувати треба за
     * підписом (self::TYPE_LABELS), інакше порядок рядків не збігається з
     * алфавітним порядком слів, які бачить користувач у колонці "Тип".
     */
    private function sortExpr(string $key): string
    {
        if ($key !== 'sto_type') {
            return $key;
        }

        $cases = [];
        foreach (self::TYPE_LABELS as $code => $label) {
            $cases[] = 'WHEN ' . $this->pdo->quote($code) . ' THEN ' . $this->pdo->quote($label);
        }

        return 'CASE sto_type ' . implode(' ', $cases) . ' ELSE sto_type END';
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
            'phones'     => array_values(array_filter(explode(';', (string) $row['phones']), static fn ($p) => $p !== '')),
            'rating'     => $row['rating'] !== null ? (float) $row['rating'] : null,
            'is_active'  => (bool) $row['is_active'],
            'country_id' => $row['country_id'] !== null ? (int) $row['country_id'] : null,
            'description' => $row['description'],
        ];
    }
}
