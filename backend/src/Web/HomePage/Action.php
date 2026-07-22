<?php

declare(strict_types=1);

namespace App\Web\HomePage;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * Це API-бекенд без власних HTML-сторінок — дефолтний HTML-рендер зі стартера
 * прибрали (він вимагав публікації ассетів у public/assets, що нам тут не потрібно).
 */
final readonly class Action
{
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function __invoke(): ResponseInterface
    {
        $response = $this->responseFactory->createResponse(200)
            ->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode([
            'status'  => 'success',
            'message' => 'Admin API (fake backend). Дивись документацію: /api/admin/doc',
        ], JSON_UNESCAPED_UNICODE));

        return $response;
    }
}
