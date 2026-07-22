<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

namespace App\Admin;

use OpenApi\Attributes as OA;

#[OA\Info(version: '1.0.0', title: 'Admin API (fake backend)', description: 'Демо-бекенд адмінки: дані з CSV у SQLite, скидаються при рестарті контейнера')]
#[OA\SecurityScheme(securityScheme: 'BearerAuth', type: 'http', scheme: 'bearer')]
final class OpenApiInfo
{
}
