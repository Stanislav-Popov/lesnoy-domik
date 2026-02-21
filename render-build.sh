#!/usr/bin/env bash
# render-build.sh — скрипт сборки для Render

set -e

echo "📦 Устанавливаю зависимости клиента..."
cd client
npm install --legacy-peer-deps

echo "🔨 Собираю React-приложение..."
npm run build

echo "📦 Устанавливаю зависимости сервера..."
cd ../server
npm install

echo "✅ Сборка завершена!"