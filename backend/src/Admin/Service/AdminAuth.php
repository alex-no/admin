<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

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
        return in_array($permission, $this->resolvePermissionSlugs((int) $user['id']), true);
    }

    public function toPublicUser(array $user): array
    {
        return [
            'id'          => (int) $user['id'],
            'username'    => $user['username'],
            'name'        => $user['name'],
            'group'       => $user['group'],
            'permissions' => $this->resolvePermissionSlugs((int) $user['id']),
        ];
    }

    /** @return string[] Ефективні permission slug'и користувача (з урахуванням ієрархії ролей, deny перекриває allow) */
    public function resolvePermissionSlugs(int $userId): array
    {
        $roleIds = $this->resolveRoleIdsWithHierarchy($userId);
        if ($roleIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($roleIds), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT p.slug, rp.effect
             FROM role_permission rp
             JOIN permission p ON p.id = rp.permission_id
             WHERE rp.role_id IN ($placeholders)"
        );
        $stmt->execute($roleIds);

        $allow = [];
        $deny  = [];
        foreach ($stmt->fetchAll() as $row) {
            if ($row['effect'] === 'deny') {
                $deny[$row['slug']] = true;
            } else {
                $allow[$row['slug']] = true;
            }
        }

        return array_keys(array_diff_key($allow, $deny));
    }

    /**
     * Роль користувача + всі батьківські ролі за role_hierarchy (BFS, захист від циклів).
     * child_role_id успадковує права свого parent_role_id.
     *
     * @return int[]
     */
    private function resolveRoleIdsWithHierarchy(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT role_id FROM user_role WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
        $directRoleIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        if ($directRoleIds === []) {
            return [];
        }

        $allRoleIds = $directRoleIds;
        $processedRoleIds = [];
        $toProcess = $directRoleIds;

        while ($toProcess !== []) {
            $currentRoleId = array_shift($toProcess);
            if (in_array($currentRoleId, $processedRoleIds, true)) {
                continue;
            }
            $processedRoleIds[] = $currentRoleId;

            $parentStmt = $this->pdo->prepare(
                'SELECT parent_role_id FROM role_hierarchy WHERE child_role_id = :id'
            );
            $parentStmt->execute(['id' => $currentRoleId]);

            foreach ($parentStmt->fetchAll(PDO::FETCH_COLUMN) as $parentRoleId) {
                $parentRoleId = (int) $parentRoleId;
                if (!in_array($parentRoleId, $allRoleIds, true)) {
                    $allRoleIds[] = $parentRoleId;
                    $toProcess[] = $parentRoleId;
                }
            }
        }

        return array_unique($allRoleIds);
    }
}
