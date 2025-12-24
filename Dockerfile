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

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
ENV COMPOSER_MEMORY_LIMIT=-1

# Set working directory
WORKDIR /var/www/html

# Copy entire backend application
COPY backend/ .

# Set correct Apache document root
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Create .htaccess for Laravel
RUN echo '<IfModule mod_rewrite.c>\n    RewriteEngine On\n    RewriteCond %{REQUEST_FILENAME} !-d\n    RewriteCond %{REQUEST_FILENAME} !-f\n    RewriteRule ^ index.php [QSA,L]\n</IfModule>' > public/.htaccess

# Install composer dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
