<?php

declare(strict_types=1);

namespace App\Admin\Controller;

use OpenApi\Generator;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * Swagger UI на /api/admin/doc — саме той URL, який вже читає
 * фронтенд-сторінка "Dev Tools > API Docs (Admin)" (ApiDocsAdmin.vue).
 */
final readonly class ApiDocController
{
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function json(): ResponseInterface
    {
        $openapi = (new Generator())->generate([dirname(__DIR__, 2)]);

        $response = $this->responseFactory->createResponse(200)
            ->withHeader('Content-Type', 'application/json');
        $response->getBody()->write((string) $openapi->toJson());

        return $response;
    }

    public function ui(): ResponseInterface
    {
        $html = <<<HTML
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Admin API Documentation</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
              </head>
              <body>
                <div id="swagger-ui"></div>
                <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                <script>
                  window.onload = () => {
                    window.ui = SwaggerUIBundle({
                      url: '/api/admin/doc.json',
                      dom_id: '#swagger-ui',
                      presets: [SwaggerUIBundle.presets.apis],
                    });
                  };
                </script>
              </body>
            </html>
            HTML;

        $response = $this->responseFactory->createResponse(200)
            ->withHeader('Content-Type', 'text/html');
        $response->getBody()->write($html);

        return $response;
    }
}
