<?php

declare(strict_types=1);

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
        id         INTEGER PRIMARY KEY,
        sto_type   TEXT NOT NULL,
        name_uk    TEXT NOT NULL,
        address    TEXT,
        main_phone TEXT,
        rating     REAL,
        is_active  INTEGER NOT NULL DEFAULT 1,
        country_id INTEGER REFERENCES countries(id)
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
    $pdo->prepare(
        'INSERT INTO sto (id, sto_type, name_uk, address, main_phone, rating, is_active, country_id)
         VALUES (:id, :sto_type, :name_uk, :address, :main_phone, :rating, :is_active, :country_id)'
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

echo "Seed OK: " . $dbPath . "\n";
