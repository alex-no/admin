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
 * Приклад read-only ендпоінту без "наворотів" — довідник для case'у
 * optionsUrl у list-framework (фільтр "Країна" на "Реєстрі даних").
 */
final readonly class AdminGeographyController
{
    use JsonResponseTrait;

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/geography/countries',
        summary: 'List countries (read-only, fake data)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Geography'],
        responses: [
            new OA\Response(response: 200, description: 'List of countries'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stmt = $this->pdo->query('SELECT id, name_uk FROM countries ORDER BY name_uk');
        $rows = $stmt->fetchAll();

        return $this->json([
            'status' => 'success',
            'data'   => array_map(
                static fn(array $r) => ['id' => (int) $r['id'], 'name_uk' => $r['name_uk']],
                $rows
            ),
        ]);
    }
}
