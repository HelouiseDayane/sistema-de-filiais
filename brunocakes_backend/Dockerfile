
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

# Copia configuração customizada do PHP-FPM (arquivo está em ../docker/php-fpm.conf)
# Não é possível copiar fora do build context, então vamos criar inline
RUN mkdir -p /usr/local/etc/php-fpm.d && \
    echo '[global]' > /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'daemonize = no' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo '[www]' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm = dynamic' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm.max_children = 20' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm.start_servers = 5' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm.min_spare_servers = 3' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm.max_spare_servers = 10' >> /usr/local/etc/php-fpm.d/99-custom.conf && \
    echo 'pm.max_requests = 1000' >> /usr/local/etc/php-fpm.d/99-custom.conf

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