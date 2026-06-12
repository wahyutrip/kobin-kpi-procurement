#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Kobin KPI — setup ==="

command -v node >/dev/null 2>&1 || { echo "ERROR: node is not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is not installed"; exit 1; }

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example — review credentials before production use."
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

echo "--- Installing dependencies"
npm install

echo "--- Starting Postgres (docker compose)"
docker compose -f infra/docker-compose.yml --env-file .env.local up -d postgres

echo "--- Waiting for Postgres to be healthy"
for i in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' kobin-kpi-postgres 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    echo "Postgres is healthy."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "ERROR: Postgres did not become healthy in time"; exit 1
  fi
  sleep 2
done

echo "--- Running migrations"
npm run db:migrate

echo "--- Seeding KPI configuration"
npm run db:seed

echo ""
echo "✓ Setup complete. Start the app with: ./script/start.sh"
