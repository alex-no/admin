<?php

declare(strict_types=1);

namespace App\Web\NotFound;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Yiisoft\Http\Status;

/**
 * Це API-бекенд без власних HTML-сторінок, тому 404 завжди віддаємо як JSON
 * (замінили дефолтний HTML-рендер зі стартера — він все одно вимагав
 * публікації ассетів у public/assets, що нам тут не потрібно).
 */
final readonly class NotFoundHandler implements RequestHandlerInterface
{
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $response = $this->responseFactory->createResponse(Status::NOT_FOUND)
            ->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode([
            'status'  => 'error',
            'message' => 'Not Found',
            'path'    => $request->getUri()->getPath(),
        ], JSON_UNESCAPED_UNICODE));

        return $response;
    }
}
