<?php

declare(strict_types=1);

use App\Admin\Controller\AdminAuthController;
use App\Admin\Controller\AdminGeographyController;
use App\Admin\Controller\AdminStoController;
use App\Admin\Controller\AdminSystemController;
use App\Admin\Controller\ApiDocController;
use App\Web;
use Yiisoft\Router\Group;
use Yiisoft\Router\Route;

return [
    Group::create()
        ->routes(
            Route::get('/')
                ->action(Web\HomePage\Action::class)
                ->name('home'),

            Route::post('/api/admin/auth/login')
                ->action([AdminAuthController::class, 'login']),
            Route::get('/api/admin/auth/me')
                ->action([AdminAuthController::class, 'me']),

            Route::get('/api/admin/sto')
                ->action([AdminStoController::class, 'list']),
            Route::get('/api/admin/sto/{id:\d+}')
                ->action([AdminStoController::class, 'show']),
            Route::methods(['PUT', 'PATCH'], '/api/admin/sto/{id:\d+}')
                ->action([AdminStoController::class, 'update']),
            Route::delete('/api/admin/sto/{id:\d+}')
                ->action([AdminStoController::class, 'delete']),

            Route::get('/api/admin/geography/countries')
                ->action([AdminGeographyController::class, 'list']),

            Route::get('/api/admin/system/metrics')
                ->action([AdminSystemController::class, 'metrics']),

            Route::get('/api/admin/doc')
                ->action([ApiDocController::class, 'ui']),
            Route::get('/api/admin/doc.json')
                ->action([ApiDocController::class, 'json']),
        ),
];
