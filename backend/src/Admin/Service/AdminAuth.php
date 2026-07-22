<?php

declare(strict_types=1);

namespace App\Admin\Service;

use PDO;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Фейкова авторизація для демо-бекенду: токен — випадковий рядок,
 * що зберігається у таблиці tokens (SQLite), яка перестворюється
 * при кожному старті контейнера (data/seed.php).
 */
final readonly class AdminAuth
{
    public function __construct(private PDO $pdo)
    {
    }

    public function findUserByCredentials(string $username, string $password): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE username = :username');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        if ($user === false || !password_verify($password, $user['password_hash'])) {
            return null;
        }

        return $user;
    }

    public function issueToken(int $userId): string
    {
        $token = bin2hex(random_bytes(24));
        $stmt  = $this->pdo->prepare(
            'INSERT INTO tokens (token, user_id, created_at) VALUES (:token, :user_id, :created_at)'
        );
        $stmt->execute(['token' => $token, 'user_id' => $userId, 'created_at' => date('c')]);

        return $token;
    }

    public function userFromRequest(ServerRequestInterface $request): ?array
    {
        $header = $request->getHeaderLine('Authorization');
        if (!str_starts_with($header, 'Bearer ')) {
            return null;
        }

        $token = substr($header, 7);
        $stmt  = $this->pdo->prepare(
            'SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = :token'
        );
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch();

        return $user === false ? null : $user;
    }

    /** @return array{status:int,message:string}|null null, якщо доступ дозволено */
    public function guard(ServerRequestInterface $request, string $permission): ?array
    {
        $user = $this->userFromRequest($request);
        if ($user === null) {
            return ['status' => 401, 'message' => 'Unauthorized'];
        }
        if (!$this->can($user, $permission)) {
            return ['status' => 403, 'message' => 'Forbidden'];
        }

        return null;
    }

    public function can(array $user, string $permission): bool
    {
        foreach (explode(';', (string) $user['permissions']) as $p) {
            if ($p === '*' || $p === $permission) {
                return true;
            }
            if (str_ends_with($p, '.*') && str_starts_with($permission, substr($p, 0, -1))) {
                return true;
            }
        }

        return false;
    }

    public function toPublicUser(array $user): array
    {
        return [
            'id'          => (int) $user['id'],
            'username'    => $user['username'],
            'name'        => $user['name'],
            'group'       => $user['group'],
            'permissions' => explode(';', (string) $user['permissions']),
        ];
    }
}
