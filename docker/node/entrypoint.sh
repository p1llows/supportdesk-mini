#!/bin/sh
set -e

cd /app

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
    echo "Installing Node modules..."
    npm install
fi

echo "Starting Vite development server..."
exec npm run dev -- --host 0.0.0.0
