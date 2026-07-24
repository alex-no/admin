<?php

declare(strict_types=1);

// Copyright (c) 2026 Oleksandr Nosov. MIT License.

/**
 * Перестворює фейкову SQLite "БД" з CSV-файлів у data/csv/.
 * Запускається при кожному старті контейнера (docker/backend-entrypoint.sh) —
 * тому дані завжди скидаються до вихідного стану після рестарту.
 */

$root   = dirname(__DIR__);
$dbPath = $root . '/runtime/fake.sqlite';
$csvDir = __DIR__ . '/csv';

if (!is_dir(dirname($dbPath))) {
    mkdir(dirname($dbPath), 0777, true);
}
if (file_exists($dbPath)) {
    unlink($dbPath);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');

$pdo->exec(<<<SQL
    CREATE TABLE countries (
        id      INTEGER PRIMARY KEY,
        name_uk TEXT NOT NULL
    )
SQL);

$pdo->exec(<<<SQL
    CREATE TABLE sto (
        id          INTEGER PRIMARY KEY,
        sto_type    TEXT NOT NULL,
        name_uk     TEXT NOT NULL,
        address     TEXT,
        phones      TEXT,
        rating      REAL,
        is_active   INTEGER NOT NULL DEFAULT 1,
        country_id  INTEGER REFERENCES countries(id),
        description TEXT
    )
SQL);

$pdo->exec(<<<SQL
    CREATE TABLE users (
        id            INTEGER PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL,
        "group"       TEXT NOT NULL,
        permissions   TEXT NOT NULL
    )
SQL);

$pdo->exec(<<<SQL
    CREATE TABLE tokens (
        token      TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
    )
SQL);

$pdo->exec(<<<SQL
    CREATE TABLE pageviews (
        id                INTEGER PRIMARY KEY,
        created_at        TEXT NOT NULL,
        section           TEXT NOT NULL,
        url               TEXT NOT NULL,
        path              TEXT NOT NULL,
        method            TEXT NOT NULL,
        status_code       INTEGER NOT NULL,
        response_time     INTEGER NOT NULL,
        ip                TEXT NOT NULL,
        referer           TEXT,
        client_type       TEXT NOT NULL,
        detection_method  TEXT,
        is_bot            INTEGER NOT NULL DEFAULT 0,
        device_type       TEXT,
        browser           TEXT,
        os                TEXT,
        bot_name          TEXT,
        bot_category      TEXT,
        user_agent        TEXT,
        user_id           INTEGER REFERENCES users(id),
        session_id        TEXT
    )
SQL);
$pdo->exec('CREATE INDEX idx_pageviews_created_at ON pageviews(created_at)');

$pdo->exec(<<<SQL
    CREATE TABLE error_logs (
        id                INTEGER PRIMARY KEY,
        created_at        TEXT NOT NULL,
        level             TEXT NOT NULL,
        category          TEXT,
        message           TEXT NOT NULL,
        exception_class   TEXT,
        file              TEXT,
        line              INTEGER,
        stack_trace       TEXT,
        context           TEXT,
        url               TEXT,
        method            TEXT,
        ip                TEXT,
        user_id           INTEGER REFERENCES users(id)
    )
SQL);
$pdo->exec('CREATE INDEX idx_error_logs_created_at ON error_logs(created_at)');

$pdo->exec(<<<SQL
    CREATE TABLE banned_ips (
        id         INTEGER PRIMARY KEY,
        ip         TEXT NOT NULL UNIQUE,
        reason     TEXT NOT NULL,
        banned_at  TEXT NOT NULL,
        expires_at TEXT
    )
SQL);

function loadCsv(string $file): array
{
    $rows   = [];
    $handle = fopen($file, 'r');
    $header = fgetcsv($handle);
    while (($row = fgetcsv($handle)) !== false) {
        $rows[] = array_combine($header, $row);
    }
    fclose($handle);
    return $rows;
}

foreach (loadCsv($csvDir . '/countries.csv') as $row) {
    $pdo->prepare('INSERT INTO countries (id, name_uk) VALUES (:id, :name_uk)')
        ->execute($row);
}

foreach (loadCsv($csvDir . '/sto.csv') as $row) {
    // phones у CSV — декілька номерів через ";" (та сама конвенція, що й для
    // users.permissions), у API/формі це вже звичайний масив рядків.
    $pdo->prepare(
        'INSERT INTO sto (id, sto_type, name_uk, address, phones, rating, is_active, country_id, description)
         VALUES (:id, :sto_type, :name_uk, :address, :phones, :rating, :is_active, :country_id, :description)'
    )->execute($row);
}

foreach (loadCsv($csvDir . '/users.csv') as $row) {
    $pdo->prepare(
        'INSERT INTO users (id, username, password_hash, name, "group", permissions)
         VALUES (:id, :username, :password_hash, :name, :group, :permissions)'
    )->execute([
        'id'            => $row['id'],
        'username'      => $row['username'],
        'password_hash' => password_hash($row['password'], PASSWORD_DEFAULT),
        'name'          => $row['name'],
        'group'         => $row['group'],
        'permissions'   => $row['permissions'],
    ]);
}

// ── Аналітика/логи помилок: не з CSV (тут природньо великий, часовий, випадковий
// набір даних) — генеруються процедурно при кожному старті контейнера, тому дані
// щоразу трохи інші (як і має бути для демо "живої" аналітики).
require __DIR__ . '/fake_analytics.php';
seedPageviewsAndErrorLogs($pdo);

echo "Seed OK: " . $dbPath . "\n";
