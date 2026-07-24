<?php

declare(strict_types=1);

use App\Admin\Controller\AdminAnalyticsController;
use App\Admin\Controller\AdminAuthController;
use App\Admin\Controller\AdminErrorLogController;
use App\Admin\Controller\AdminGeographyController;
use App\Admin\Controller\AdminNetworkToolsController;
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

            Route::get('/api/admin/network-tools/my-ip')
                ->action([AdminNetworkToolsController::class, 'myIp']),
            Route::get('/api/admin/network-tools/ip-info/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'ipInfo']),
            Route::get('/api/admin/network-tools/traceroute/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'traceroute']),
            Route::get('/api/admin/network-tools/ping/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'ping']),
            Route::get('/api/admin/network-tools/reverse-dns/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'reverseDns']),
            Route::get('/api/admin/network-tools/blacklist-check/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'blacklistCheck']),
            Route::get('/api/admin/network-tools/http-headers/{ip:.+}')
                ->action([AdminNetworkToolsController::class, 'httpHeaders']),

            Route::get('/api/admin/analytics/pageviews')
                ->action([AdminAnalyticsController::class, 'list']),
            Route::get('/api/admin/analytics/stats')
                ->action([AdminAnalyticsController::class, 'stats']),
            Route::patch('/api/admin/analytics/bulk-update-client-type')
                ->action([AdminAnalyticsController::class, 'bulkUpdateClientType']),
            Route::post('/api/admin/analytics/ban-ip')
                ->action([AdminAnalyticsController::class, 'banIp']),
            Route::get('/api/admin/analytics/pageview/{id:\d+}')
                ->action([AdminAnalyticsController::class, 'show']),
            Route::patch('/api/admin/analytics/pageview/{id:\d+}/client-type')
                ->action([AdminAnalyticsController::class, 'updateClientType']),

            Route::get('/api/admin/error-logs')
                ->action([AdminErrorLogController::class, 'list']),
            Route::get('/api/admin/error-logs/stats')
                ->action([AdminErrorLogController::class, 'stats']),
            Route::delete('/api/admin/error-logs/cleanup')
                ->action([AdminErrorLogController::class, 'cleanup']),
            Route::get('/api/admin/error-logs/{id:\d+}')
                ->action([AdminErrorLogController::class, 'show']),

            Route::get('/api/admin/doc')
                ->action([ApiDocController::class, 'ui']),
            Route::get('/api/admin/doc.json')
                ->action([ApiDocController::class, 'json']),
        ),
];
