
FROM php:8.3-fpm

# Corrige permissões do /tmp para evitar erro de mkstemp
RUN chmod 1777 /tmp

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    nginx \
    git \
    unzip \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    netcat-openbsd \
    redis-tools \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Instalação do Redis (phpredis via PECL)
RUN pecl install redis \
    && docker-php-ext-enable redis

# Instala Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Copia o código da aplicação
WORKDIR /var/www/html
COPY . .

# Instala dependências do Laravel
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Permissões
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Copia configuração customizada do PHP
COPY php.ini /usr/local/etc/php/conf.d/custom.ini

# Copia a configuração do nginx
COPY default.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && \
    rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

# Copia o script de inicialização
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]