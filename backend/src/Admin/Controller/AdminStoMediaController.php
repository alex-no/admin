<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

namespace App\Admin\Controller;

use App\Admin\Service\AdminAuth;
use App\Admin\Support\JsonResponseTrait;
use App\Shared\Infrastructure\Storage\ImageProcessor;
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

    private const MAX_URL_FETCH_BYTES = 8 * 1024 * 1024; // те саме, що upload_max_filesize (docker/php-uploads.ini)

    private const MAX_REDIRECTS = 3;

    public function __construct(
        private AdminAuth $auth,
        private PDO $pdo,
        private ResponseFactoryInterface $responseFactory,
        private ImageProcessor $imageProcessor,
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
        $files = $request->getUploadedFiles();
        $file  = $files['photo'] ?? null;

        // Якщо тіло запиту перевищило post_max_size, PHP відкидає його ще до роутингу:
        // сюди приходить порожній список файлів при ненульовому Content-Length. Без цієї
        // гілки користувач побачив би "Файл не передано", хоча файл він якраз передав.
        if ($files === [] && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
            return $this->json([
                'status'  => 'error',
                'message' => 'Запит завеликий (ліміт сервера — ' . ini_get('post_max_size') . ')',
            ], 400);
        }

        if (!$file instanceof UploadedFileInterface) {
            return $this->json(['status' => 'error', 'message' => 'Файл не передано'], 400);
        }

        $uploadError = $file->getError();
        if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
            return $this->json([
                'status'  => 'error',
                'message' => 'Файл завеликий (максимум ' . ini_get('upload_max_filesize') . ')',
            ], 400);
        }
        if ($uploadError !== UPLOAD_ERR_OK) {
            return $this->json([
                'status'  => 'error',
                'message' => 'Не вдалося завантажити файл (код помилки ' . $uploadError . ')',
            ], 400);
        }

        // Тип визначаємо за вмістом, а не за getClientMediaType() — той приходить
        // від браузера і підробляється тривіально (curl -F 'photo=@script.txt;type=image/png').
        // Шлях "за URL" нижче робить так само, тож перевірка в обох однакова.
        $rawBytes  = $file->getStream()->getContents();
        $imageInfo = @getimagesizefromstring($rawBytes);
        $mime      = $imageInfo['mime'] ?? null;
        $ext       = self::ALLOWED_MIME_TO_EXT[$mime] ?? null;
        if ($ext === null) {
            return $this->json(['status' => 'error', 'message' => 'Підтримуються лише JPG, PNG, WebP'], 400);
        }

        // Convert to WebP
        try {
            $processed = $this->imageProcessor->processToWebp($rawBytes, maxSide: 1920, quality: 85);
        } catch (\RuntimeException $e) {
            return $this->json(['status' => 'error', 'message' => 'Помилка обробки зображення: ' . $e->getMessage()], 422);
        }

        $fileName = bin2hex(random_bytes(8)) . '.webp';
        file_put_contents($this->mediaDir() . '/' . $fileName, $processed['content']);

        $id = $this->insertMedia(
            stoId: $stoId,
            fileName: $fileName,
            originalName: $file->getClientFilename(),
            mimeType: 'image/webp',
            size: strlen($processed['content']),
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

        $fetched = $this->fetchRemoteImage($url);
        if (isset($fetched['error'])) {
            return $this->json(['status' => 'error', 'message' => $fetched['error']], 400);
        }

        $rawBytes = $fetched['bytes'];
        if (strlen($rawBytes) > self::MAX_URL_FETCH_BYTES) {
            return $this->json(['status' => 'error', 'message' => 'Файл завеликий (максимум 8 МБ)'], 400);
        }

        $imageInfo = @getimagesizefromstring($rawBytes);
        $mime      = $imageInfo['mime'] ?? null;
        $ext       = self::ALLOWED_MIME_TO_EXT[$mime] ?? null;
        if ($ext === null) {
            return $this->json(['status' => 'error', 'message' => 'Посилання не веде на зображення JPG/PNG/WebP'], 400);
        }

        // Convert to WebP
        try {
            $processed = $this->imageProcessor->processToWebp($rawBytes, maxSide: 1920, quality: 85);
        } catch (\RuntimeException $e) {
            return $this->json(['status' => 'error', 'message' => 'Помилка обробки зображення: ' . $e->getMessage()], 422);
        }

        $fileName = bin2hex(random_bytes(8)) . '.webp';
        file_put_contents($this->mediaDir() . '/' . $fileName, $processed['content']);

        $id = $this->insertMedia(
            stoId: $stoId,
            fileName: $fileName,
            originalName: basename(parse_url($url, PHP_URL_PATH) ?? ''),
            mimeType: 'image/webp',
            size: strlen($processed['content']),
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

    /**
     * Тягне зображення за посиланням, перевіряючи КОЖЕН крок перенаправлення.
     * Без цього аплоад "за URL" — це SSRF: сервер сходить туди, куди браузер
     * користувача доступу не має (сусідні контейнери, 169.254.169.254 з метаданими
     * хмари тощо), а різниця в текстах помилок підкаже, що саме там відповіло.
     * Перевіряти лише початковий URL недостатньо — редирект веде куди завгодно.
     *
     * @return array{bytes?: string, error?: string}
     */
    private function fetchRemoteImage(string $url): array
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            if ($error = $this->rejectNonPublicUrl($url)) {
                return ['error' => $error];
            }

            $context = stream_context_create([
                'http' => [
                    'timeout'         => 10,
                    'follow_location' => 0, // переходи робимо самі — щоб перевірити кожен
                    'ignore_errors'   => true,
                    // Без User-Agent багато джерел (Wikimedia та ін.) відповідають 403.
                    'header'          => "User-Agent: AdminPanel/1.0 (photo import)\r\nAccept: image/*\r\n",
                ],
            ]);

            $bytes   = @file_get_contents($url, false, $context, 0, self::MAX_URL_FETCH_BYTES + 1);
            $headers = $http_response_header ?? [];
            $status  = $this->statusFromHeaders($headers);

            if ($status >= 300 && $status < 400) {
                $location = $this->headerValue($headers, 'location');
                if ($location === null) {
                    return ['error' => 'Не вдалося завантажити файл за посиланням'];
                }
                $url = $this->resolveLocation($url, $location);
                continue;
            }

            if ($bytes === false || $status >= 400) {
                return ['error' => 'Не вдалося завантажити файл за посиланням'];
            }

            return ['bytes' => $bytes];
        }

        return ['error' => 'Забагато перенаправлень'];
    }

    /** Текст помилки, якщо хост не є публічною адресою; null — якщо все гаразд. */
    private function rejectNonPublicUrl(string $url): ?string
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return 'Підтримуються лише http/https посилання';
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return 'Некоректне посилання';
        }

        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : $this->resolveHost($host);
        if ($ips === []) {
            return 'Не вдалося визначити адресу хоста';
        }

        foreach ($ips as $ip) {
            // NO_PRIV_RANGE відсікає 10/8, 172.16/12, 192.168/16, fc00::/7;
            // NO_RES_RANGE — 127/8, 169.254/16, 0/8, ::1 та інші службові діапазони.
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return 'Посилання веде на внутрішню адресу мережі — заборонено';
            }
        }

        return null;
    }

    /** @return string[] */
    private function resolveHost(string $host): array
    {
        $ips = gethostbynamel($host) ?: [];

        foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $record) {
            if (isset($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }

        return $ips;
    }

    /** @param string[] $headers */
    private function statusFromHeaders(array $headers): int
    {
        $status = 0;
        foreach ($headers as $header) {
            // Після кожного переходу масив доповнюється — актуальний статус останній.
            if (preg_match('~^HTTP/\S+\s+(\d{3})~', $header, $m)) {
                $status = (int) $m[1];
            }
        }

        return $status;
    }

    /** @param string[] $headers */
    private function headerValue(array $headers, string $name): ?string
    {
        $value = null;
        foreach ($headers as $header) {
            if (stripos($header, $name . ':') === 0) {
                $value = trim(substr($header, strlen($name) + 1));
            }
        }

        return $value;
    }

    /** Location буває відносним — доводимо до абсолютного, щоб перевірити хост. */
    private function resolveLocation(string $baseUrl, string $location): string
    {
        if (preg_match('~^https?://~i', $location)) {
            return $location;
        }

        $parts = parse_url($baseUrl);
        $base  = ($parts['scheme'] ?? 'http') . '://' . ($parts['host'] ?? '');
        if (isset($parts['port'])) {
            $base .= ':' . $parts['port'];
        }

        if (str_starts_with($location, '/')) {
            return $base . $location;
        }

        $dir = rtrim(str_replace('\\', '/', dirname($parts['path'] ?? '/')), '/');

        return $base . $dir . '/' . $location;
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
