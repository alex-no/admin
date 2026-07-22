#!/bin/sh
set -e

cd /var/www/html

# Розпакування на bind-mount диска H: буває повільним — піднімаємо таймаут composer.
composer config --global process-timeout 1200

# 1) Перше піднімання контейнера — порожня (bind-mount) директорія: розгортаємо стартер Yii3.
#    --no-dev: rector/psalm/phpunit/codeception тут не потрібні (фейковий бекенд без наворотів).
if [ ! -f composer.json ]; then
  echo "==> composer create-project yiisoft/app (перший запуск, це займе кілька хвилин)"
  composer create-project --prefer-dist --no-interaction --no-dev --stability=dev yiisoft/app .
fi

# 2) Наші власні залежності, яких немає у стартері.
if ! grep -q "zircote/swagger-php" composer.json; then
  echo "==> composer require zircote/swagger-php"
  composer require --no-interaction --no-audit zircote/swagger-php
fi

composer install --no-interaction --no-dev

# 3) Фейкова "БД": SQLite-файл перестворюється з CSV при кожному старті контейнера.
mkdir -p runtime
php data/seed.php

chown -R www-data:www-data runtime 2>/dev/null || true

exec apache2-foreground
