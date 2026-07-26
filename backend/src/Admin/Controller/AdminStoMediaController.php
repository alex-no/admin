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
use Psr\Http\Message\UploadedFileInterface;

/**
 * Демо-аплоад фото для картки СТО: без MinIO/S3 — файли зберігаються прямо
 * у public/api/media/ (Apache віддає їх напряму, до Yii-роутингу справа не
 * доходить), метадані — у фейковій таблиці sto_media. Каталог і таблиця
 * скидаються при кожному рестарті контейнера (data/seed.php), як і все інше тут.
 */
final readonly class AdminStoMediaController
{
    use JsonResponseTrait;

    private const ALLOWED_MIME_TO_EXT = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_URL_FETCH_BYTES = 8 * 1024 * 1024; // те саме, що дефолтний post_max_size

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/sto/{id}/media',
        summary: 'List photos attached to an STO record',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO Media'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'List of photos'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function list(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stoId = $this->stoIdFromPath($request);
        $stmt  = $this->pdo->prepare('SELECT * FROM sto_media WHERE sto_id = :sto_id ORDER BY created_at');
        $stmt->execute(['sto_id' => $stoId]);

        return $this->json(['status' => 'success', 'data' => array_map($this->format(...), $stmt->fetchAll())]);
    }

    #[OA\Post(
        path: '/api/admin/sto/{id}/media',
        summary: 'Upload a photo from local disk',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO Media'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [new OA\Property(property: 'photo', type: 'string', format: 'binary')]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Photo uploaded'),
            new OA\Response(response: 400, description: 'Missing file or unsupported type'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function upload(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stoId = $this->stoIdFromPath($request);
        $file  = $request->getUploadedFiles()['photo'] ?? null;

        if (!$file instanceof UploadedFileInterface || $file->getError() !== UPLOAD_ERR_OK) {
            return $this->json(['status' => 'error', 'message' => 'Файл не передано'], 400);
        }

        $mime = $file->getClientMediaType();
        $ext  = self::ALLOWED_MIME_TO_EXT[$mime] ?? null;
        if ($ext === null) {
            return $this->json(['status' => 'error', 'message' => 'Підтримуються лише JPG, PNG, WebP'], 400);
        }

        $fileName = bin2hex(random_bytes(8)) . '.' . $ext;
        $file->moveTo($this->mediaDir() . '/' . $fileName);

        $id = $this->insertMedia(
            stoId: $stoId,
            fileName: $fileName,
            originalName: $file->getClientFilename(),
            mimeType: $mime,
            size: $file->getSize() ?? 0,
            source: 'upload',
            sourceUrl: null,
        );

        return $this->json(['status' => 'success', 'data' => $this->format($this->fetchMedia($id))], 201);
    }

    #[OA\Post(
        path: '/api/admin/sto/{id}/media/from-url',
        summary: 'Fetch a photo from a URL and store it',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO Media'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['url'],
                properties: [new OA\Property(property: 'url', type: 'string', example: 'https://example.com/photo.jpg')]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Photo downloaded and stored'),
            new OA\Response(response: 400, description: 'Invalid URL or unsupported/oversized content'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
        ]
    )]
    public function uploadFromUrl(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stoId = $this->stoIdFromPath($request);
        $data  = json_decode((string) $request->getBody(), true) ?? [];
        $url   = trim((string) ($data['url'] ?? ''));

        $scheme = parse_url($url, PHP_URL_SCHEME);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return $this->json(['status' => 'error', 'message' => 'Підтримуються лише http/https посилання'], 400);
        }

        $context = stream_context_create([
            'http' => ['timeout' => 10, 'follow_location' => 1, 'max_redirects' => 3],
            'https' => ['timeout' => 10],
        ]);
        $bytes = @file_get_contents($url, false, $context, 0, self::MAX_URL_FETCH_BYTES + 1);

        if ($bytes === false) {
            return $this->json(['status' => 'error', 'message' => 'Не вдалося завантажити файл за посиланням'], 400);
        }
        if (strlen($bytes) > self::MAX_URL_FETCH_BYTES) {
            return $this->json(['status' => 'error', 'message' => 'Файл завеликий (максимум 8 МБ)'], 400);
        }

        $imageInfo = @getimagesizefromstring($bytes);
        $mime      = $imageInfo['mime'] ?? null;
        $ext       = self::ALLOWED_MIME_TO_EXT[$mime] ?? null;
        if ($ext === null) {
            return $this->json(['status' => 'error', 'message' => 'Посилання не веде на зображення JPG/PNG/WebP'], 400);
        }

        $fileName = bin2hex(random_bytes(8)) . '.' . $ext;
        file_put_contents($this->mediaDir() . '/' . $fileName, $bytes);

        $id = $this->insertMedia(
            stoId: $stoId,
            fileName: $fileName,
            originalName: basename(parse_url($url, PHP_URL_PATH) ?? ''),
            mimeType: $mime,
            size: strlen($bytes),
            source: 'url',
            sourceUrl: $url,
        );

        return $this->json(['status' => 'success', 'data' => $this->format($this->fetchMedia($id))], 201);
    }

    #[OA\Patch(
        path: '/api/admin/sto/{id}/media/{mediaId}',
        summary: 'Update photo caption or set it as cover',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO Media'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'mediaId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'caption', type: 'string'),
                    new OA\Property(property: 'is_cover', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Photo updated'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Photo not found'),
        ]
    )]
    public function update(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stoId   = $this->stoIdFromPath($request);
        $mediaId = $this->mediaIdFromPath($request);
        $media   = $this->fetchMedia($mediaId);
        if ($media === false || (int) $media['sto_id'] !== $stoId) {
            return $this->json(['status' => 'error', 'message' => 'Фото не знайдено'], 404);
        }

        $data = json_decode((string) $request->getBody(), true) ?? [];

        if (array_key_exists('is_cover', $data) && $data['is_cover']) {
            $this->pdo->prepare('UPDATE sto_media SET is_cover = 0 WHERE sto_id = :sto_id')->execute(['sto_id' => $stoId]);
            $this->pdo->prepare('UPDATE sto_media SET is_cover = 1 WHERE id = :id')->execute(['id' => $mediaId]);
        }
        if (array_key_exists('caption', $data)) {
            $this->pdo->prepare('UPDATE sto_media SET caption = :caption WHERE id = :id')
                ->execute(['caption' => $data['caption'], 'id' => $mediaId]);
        }

        return $this->json(['status' => 'success', 'data' => $this->format($this->fetchMedia($mediaId))]);
    }

    #[OA\Delete(
        path: '/api/admin/sto/{id}/media/{mediaId}',
        summary: 'Delete a photo',
        security: [['BearerAuth' => []]],
        tags: ['Admin - STO Media'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'mediaId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Photo deleted'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Photo not found'),
        ]
    )]
    public function delete(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'sto.edit')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $stoId   = $this->stoIdFromPath($request);
        $mediaId = $this->mediaIdFromPath($request);
        $media   = $this->fetchMedia($mediaId);
        if ($media === false || (int) $media['sto_id'] !== $stoId) {
            return $this->json(['status' => 'error', 'message' => 'Фото не знайдено'], 404);
        }

        $path = $this->mediaDir() . '/' . $media['file_name'];
        if (is_file($path)) {
            unlink($path);
        }
        $this->pdo->prepare('DELETE FROM sto_media WHERE id = :id')->execute(['id' => $mediaId]);

        return $this->json(['status' => 'success']);
    }

    private function insertMedia(
        int $stoId,
        string $fileName,
        ?string $originalName,
        string $mimeType,
        int $size,
        string $source,
        ?string $sourceUrl,
    ): int {
        $stmt = $this->pdo->prepare(
            'INSERT INTO sto_media (sto_id, file_name, original_name, mime_type, size, source, source_url, created_at)
             VALUES (:sto_id, :file_name, :original_name, :mime_type, :size, :source, :source_url, :created_at)'
        );
        $stmt->execute([
            'sto_id'        => $stoId,
            'file_name'     => $fileName,
            'original_name' => $originalName,
            'mime_type'     => $mimeType,
            'size'          => $size,
            'source'        => $source,
            'source_url'    => $sourceUrl,
            'created_at'    => date('c'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    private function mediaDir(): string
    {
        // __DIR__ = src/Admin/Controller → up 3 levels reaches the backend project root.
        return dirname(__DIR__, 3) . '/public/api/media';
    }

    private function stoIdFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/api/admin/sto/(\d+)~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function mediaIdFromPath(ServerRequestInterface $request): int
    {
        preg_match('~/media/(\d+)$~', $request->getUri()->getPath(), $m);
        return (int) ($m[1] ?? 0);
    }

    private function fetchMedia(int $id): array|false
    {
        $stmt = $this->pdo->prepare('SELECT * FROM sto_media WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    private function format(array $row): array
    {
        return [
            'id'       => (int) $row['id'],
            'url'      => '/api/media/' . $row['file_name'],
            'caption'  => $row['caption'],
            'is_cover' => (bool) $row['is_cover'],
        ];
    }
}
