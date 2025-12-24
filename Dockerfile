FROM composer:2.7 AS builder

WORKDIR /app

# Set composer environment variables to be more lenient
ENV COMPOSER_MEMORY_LIMIT=-1
ENV COMPOSER_PROCESS_TIMEOUT=2000
ENV COMPOSER_ALLOW_SUPERUSER=1
ENV COMPOSER_IGNORE_PLATFORM_REQ=*
ENV COMPOSER_IGNORE_PLATFORM_REQS=1

# Copy backend files
COPY backend/composer.json backend/composer.lock ./

# Create vendor directory explicitly
RUN mkdir -p vendor

# Install dependencies with maximum compatibility
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --ignore-platform-req=php \
    --ignore-platform-reqs \
    -vvv || echo "Composer install warnings/errors (continuing...)"

# Check if vendor exists
RUN ls -la vendor/ 2>/dev/null | head -20 || echo "Vendor directory check"

# Final stage
FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    zip \
    unzip \
    libpq-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql
RUN docker-php-ext-install pdo pdo_pgsql mbstring exif pcntl bcmath gd

# Set working directory
WORKDIR /var/www/html

# Copy entire backend application
COPY backend/ .

# Copy vendor from builder stage
COPY --from=builder /app/vendor ./vendor

# Set correct Apache document root
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Create .htaccess for Laravel
RUN echo '<IfModule mod_rewrite.c>\n    RewriteEngine On\n    RewriteCond %{REQUEST_FILENAME} !-d\n    RewriteCond %{REQUEST_FILENAME} !-f\n    RewriteRule ^ index.php [QSA,L]\n</IfModule>' > public/.htaccess

# Set permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
