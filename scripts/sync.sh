#!/usr/bin/env bash
set -e

echo "====================================================="
echo "🔄 [FixMe] Automated Git Pull & Environment Refresh"
echo "====================================================="

# 1. Pull latest code from GitHub
echo "⬇️  1/6 Pulling latest changes from git..."
git pull origin main

# 2. Stop running containers if docker is running
echo "🛑 2/6 Stopping existing containers..."
docker compose down || docker-compose down || true

# 3. Build monorepo packages
echo "📦 3/6 Building packages..."
npm run build

# 4. Start essential background services (Postgres, Redis, MinIO)
echo "🚀 4/6 Starting Postgres, Redis, and MinIO..."
docker compose up postgres redis minio minio-setup -d || docker-compose up postgres redis minio minio-setup -d

# 5. Wait for Postgres to be ready for connections
echo "⏳ 5/6 Waiting for PostgreSQL to be ready..."
sleep 4

# 6. Run migrations & Dev Seeding
echo "🗄️  6/6 Running database migrations & dev seed..."
npm run db:migrate || true
npm run db:seed:dev --workspace=apps/api || true

echo "====================================================="
echo "✅ [FixMe] Environment refreshed & ready to go!"
echo "====================================================="
