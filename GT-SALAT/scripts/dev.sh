#!/usr/bin/env bash
# GT-SALAT — تشغيل وضع التطوير مع hot-reload
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
    echo "📦 أول تشغيل — تثبيت الاعتماديات..."
    npm install
fi

echo "🚀 تشغيل GT-SALAT في وضع التطوير (Vite + Electron)..."
npm run dev
