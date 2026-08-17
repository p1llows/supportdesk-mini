#!/bin/bash
set -e

cd /var/www/html

if [ ! -f "vendor/autoload.php" ]; then
    echo "Installing Composer dependencies..."
    if ! composer install --no-interaction --prefer-dist --optimize-autoloader; then
        echo "Lockfile platform mismatch detected. Updating dependencies for container environment..."
        composer update --no-interaction --prefer-dist --optimize-autoloader
    fi
fi

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

if ! grep -q "APP_KEY=base64:" .env || [ -z "$(grep APP_KEY= .env | cut -d '=' -f2)" ]; then
    echo "Generating Application Key..."
    php artisan key:generate --force
fi

echo "Starting Laravel application server..."
exec php artisan serve --host=0.0.0.0 --port=8000
