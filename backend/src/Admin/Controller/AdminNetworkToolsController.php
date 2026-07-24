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

/**
 * Мережеві діагностичні інструменти для вкладки "Діагностика" деталей візиту
 * (AnalyticsDetailsModalContent.vue) — перенесено 1:1 з продакшн-AllSTO
 * (Module/Admin/Api/Controller/AdminNetworkToolsController.php), тільки
 * простір імен/DI-обв'язка адаптовані під цей каркас.
 *
 * Це справжні мережеві операції (ping/traceroute — реальний exec(), ip-info —
 * реальний запит до ip-api.com, http-headers — реальний curl на цільову IP,
 * blacklist-check — реальні DNS-запити до публічних RBL) проти IP-адрес із
 * фейкових даних аналітики. IP валідується через filter_var() перед
 * підстановкою в shell-команду (як і в оригіналі) — довільний рядок туди не
 * потрапляє.
 */
final readonly class AdminNetworkToolsController
{
    use JsonResponseTrait;

    public function __construct(
        private AdminAuth $auth,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    #[OA\Get(
        path: '/api/admin/network-tools/my-ip',
        summary: "Caller's own IP address, as seen by the server",
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        responses: [
            new OA\Response(response: 200, description: 'IP address'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function myIp(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $server = $request->getServerParams();
        $ip = $server['REMOTE_ADDR'] ?? $server['HTTP_X_FORWARDED_FOR'] ?? $server['HTTP_CLIENT_IP'] ?? '0.0.0.0';
        if (str_contains((string) $ip, ',')) {
            $ip = trim(explode(',', (string) $ip)[0]);
        }

        return $this->json([
            'status' => 'success',
            'data'   => [
                'ip'              => $ip,
                'remote_addr'     => $server['REMOTE_ADDR'] ?? null,
                'x_forwarded_for' => $server['HTTP_X_FORWARDED_FOR'] ?? null,
                'x_real_ip'       => $server['HTTP_X_REAL_IP'] ?? null,
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/network-tools/ip-info/{ip}',
        summary: 'IP geolocation via ip-api.com',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'IP info'),
            new OA\Response(response: 400, description: 'Invalid IP / lookup failed'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function ipInfo(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'ip-info');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IP address'], 400);
        }

        try {
            $url = "http://ip-api.com/json/{$ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Admin-Framework-Demo/1.0');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                throw new \RuntimeException('Failed to fetch IP information');
            }

            $data = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \RuntimeException('Invalid JSON response from IP API');
            }
            if (($data['status'] ?? null) === 'fail') {
                return $this->json(['status' => 'error', 'message' => $data['message'] ?? 'Unknown error from IP API'], 400);
            }

            return $this->json(['status' => 'success', 'data' => $data]);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/network-tools/traceroute/{ip}',
        summary: 'Traceroute to an IP (real exec, IP-validated before shelling out)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Traceroute output'),
            new OA\Response(response: 400, description: 'Invalid IP'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function traceroute(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'traceroute');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IP address'], 400);
        }

        $command = "traceroute -m 15 -w 1 {$ip} 2>&1";
        $output  = [];
        exec($command, $output);

        return $this->json(['status' => 'success', 'data' => ['command' => $command, 'output' => implode("\n", $output), 'lines' => $output]]);
    }

    #[OA\Get(
        path: '/api/admin/network-tools/ping/{ip}',
        summary: 'Ping an IP (real exec, IP-validated before shelling out)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Ping output'),
            new OA\Response(response: 400, description: 'Invalid IP'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function ping(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'ping');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IP address'], 400);
        }

        $command   = "ping -c 4 -W 1 {$ip} 2>&1";
        $output    = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);

        return $this->json([
            'status' => 'success',
            'data'   => ['command' => $command, 'output' => implode("\n", $output), 'lines' => $output, 'success' => $returnVar === 0],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/network-tools/reverse-dns/{ip}',
        summary: 'Reverse DNS (PTR) lookup',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'PTR record'),
            new OA\Response(response: 400, description: 'Invalid IP'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function reverseDns(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'reverse-dns');
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IP address'], 400);
        }

        $hostname = gethostbyaddr($ip);

        return $this->json(['status' => 'success', 'data' => ['ip' => $ip, 'hostname' => $hostname !== $ip ? $hostname : null]]);
    }

    #[OA\Get(
        path: '/api/admin/network-tools/blacklist-check/{ip}',
        summary: 'Check an IPv4 against common RBL blacklists',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Blacklist check result'),
            new OA\Response(response: 400, description: 'Invalid IPv4'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function blacklistCheck(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'blacklist-check');
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IPv4 address'], 400);
        }

        $rblServers = [
            'zen.spamhaus.org'       => 'Spamhaus ZEN',
            'bl.spamcop.net'         => 'SpamCop',
            'b.barracudacentral.org' => 'Barracuda',
            'dnsbl.sorbs.net'        => 'SORBS',
            'spam.dnsbl.sorbs.net'   => 'SORBS SPAM',
            'cbl.abuseat.org'        => 'CBL (Composite)',
            'dnsbl-1.uceprotect.net' => 'UCEPROTECT L1',
            'psbl.surriel.com'       => 'PSBL',
        ];

        $reversedIp  = implode('.', array_reverse(explode('.', $ip)));
        $results     = [];
        $listedCount = 0;

        foreach ($rblServers as $rbl => $name) {
            $query    = "{$reversedIp}.{$rbl}";
            $result   = gethostbyname($query);
            $isListed = $result !== $query;
            if ($isListed) {
                $listedCount++;
            }
            $results[] = ['name' => $name, 'server' => $rbl, 'listed' => $isListed, 'response' => $isListed ? $result : null];
        }

        return $this->json([
            'status' => 'success',
            'data'   => [
                'ip'           => $ip,
                'listed_count' => $listedCount,
                'total_checks' => count($rblServers),
                'is_clean'     => $listedCount === 0,
                'results'      => $results,
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/admin/network-tools/http-headers/{ip}',
        summary: 'Fetch HTTP response headers from an IP (if it runs a web server)',
        security: [['BearerAuth' => []]],
        tags: ['Admin - Network Tools'],
        parameters: [new OA\Parameter(name: 'ip', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Response headers'),
            new OA\Response(response: 400, description: 'Invalid IP / could not connect'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function httpHeaders(ServerRequestInterface $request): ResponseInterface
    {
        if ($err = $this->auth->guard($request, 'analytics.view')) {
            return $this->json(['status' => 'error', 'message' => $err['message']], $err['status']);
        }

        $ip = $this->extractIp($request, 'http-headers');
        if (!filter_var($ip, FILTER_VALIDATE_IP) && !preg_match('/^[a-zA-Z0-9.-]+$/', $ip)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid IP address or hostname'], 400);
        }

        $headers    = [];
        $successful = false;
        $protocol   = null;

        foreach (['https', 'http'] as $proto) {
            $headers = [];
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "{$proto}://{$ip}");
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Admin-Framework-Demo/1.0');
            curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) use (&$headers) {
                $len    = strlen($header);
                $header = trim($header);
                if ($header && str_contains($header, ':')) {
                    [$name, $value] = explode(':', $header, 2);
                    $headers[trim($name)] = trim($value);
                } elseif (preg_match('/^HTTP\/[\d.]+\s+(\d+)/', $header, $m)) {
                    $headers['_status_code'] = (int) $m[1];
                    $headers['_status_line'] = $header;
                }
                return $len;
            });

            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode > 0) {
                $successful = true;
                $protocol   = $proto;
                break;
            }
        }

        if (!$successful) {
            return $this->json([
                'status'  => 'error',
                'message' => "Не вдалося підключитися до {$ip} (спробовано HTTP та HTTPS). Переконайтеся, що це IP веб-сервера, а не клієнта.",
            ], 400);
        }

        $interestingHeaders = [
            'Server', 'X-Powered-By', 'Content-Type', 'Set-Cookie',
            'X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security',
            'Content-Security-Policy', 'X-XSS-Protection', 'Access-Control-Allow-Origin',
            '_status_line', '_status_code',
        ];
        $filtered = array_intersect_key($headers, array_flip($interestingHeaders));

        return $this->json([
            'status' => 'success',
            'data'   => [
                'ip'              => $ip,
                'protocol'        => $protocol,
                'url'             => "{$protocol}://{$ip}",
                'all_headers'     => $headers,
                'notable_headers' => $filtered,
            ],
        ]);
    }

    private function extractIp(ServerRequestInterface $request, string $endpoint): string
    {
        preg_match("~/network-tools/{$endpoint}/(.+)$~", $request->getUri()->getPath(), $m);
        return $m[1] ?? '';
    }
}
