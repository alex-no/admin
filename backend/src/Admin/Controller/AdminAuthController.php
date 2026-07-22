<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

namespace App\Admin\Controller;

use App\Admin\Service\AdminAuth;
use App\Admin\Support\JsonResponseTrait;
use OpenApi\Attributes as OA;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final readonly class AdminAuthController
{
    use JsonResponseTrait;

    public function __construct(
        private AdminAuth $auth,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Post(
        path: '/api/admin/auth/login',
        summary: 'Admin login',
        description: 'Фейковий бекенд: облікові записи задаються у data/csv/users.csv (напр. admin / admin123)',
        tags: ['Admin - Auth'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['username', 'password'],
                properties: [
                    new OA\Property(property: 'username', type: 'string', example: 'admin'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'admin123'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Login successful',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'token', type: 'string'),
                        new OA\Property(
                            property: 'user',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'id', type: 'integer'),
                                new OA\Property(property: 'username', type: 'string'),
                                new OA\Property(property: 'name', type: 'string'),
                                new OA\Property(property: 'group', type: 'string'),
                                new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string')),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Username and password required'),
            new OA\Response(response: 401, description: 'Invalid credentials'),
        ]
    )]
    public function login(ServerRequestInterface $request): ResponseInterface
    {
        $data     = json_decode((string) $request->getBody(), true) ?? [];
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            return $this->json(['status' => 'error', 'message' => 'Username and password required'], 400);
        }

        $user = $this->auth->findUserByCredentials($username, $password);
        if ($user === null) {
            return $this->json(['status' => 'error', 'message' => 'Invalid credentials'], 401);
        }

        return $this->json([
            'status' => 'success',
            'token'  => $this->auth->issueToken((int) $user['id']),
            'user'   => $this->auth->toPublicUser($user),
        ]);
    }

    #[OA\Get(
        path: '/api/admin/auth/me',
        summary: 'Current admin user',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Auth'],
        responses: [
            new OA\Response(response: 200, description: 'Current user'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function me(ServerRequestInterface $request): ResponseInterface
    {
        $user = $this->auth->userFromRequest($request);
        if ($user === null) {
            return $this->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        return $this->json(['status' => 'success', 'user' => $this->auth->toPublicUser($user)]);
    }
}
