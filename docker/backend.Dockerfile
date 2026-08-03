FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    mc \
    sqlite3 \
    libsqlite3-dev \
    iputils-ping \
    traceroute \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libwebp-dev

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_sqlite gd

RUN a2enmod rewrite headers

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY php-uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY apache/backend.conf /etc/apache2/sites-available/000-default.conf
COPY backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

WORKDIR /var/www/html

CMD ["/usr/local/bin/backend-entrypoint.sh"]
