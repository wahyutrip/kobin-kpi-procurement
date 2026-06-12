#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found. Run ./script/setup.sh first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

docker compose -f infra/docker-compose.yml --env-file .env.local up -d postgres

if [ "${1:-dev}" = "--prod" ]; then
  echo "=== Starting Kobin KPI (production build) ==="
  npm run build
  npm run start
else
  echo "=== Starting Kobin KPI (development) ==="
  npm run dev
fi
