#!/bin/sh
set -e

echo "▶ Running main DB migrations..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @deseo/db db:migrate

echo "▶ Running connector-github migrations..."
DATABASE_URL="$CONNECTOR_GITHUB_DATABASE_URL" pnpm --filter @deseo/connector-github db:migrate

echo "▶ Running connector-gsc migrations..."
DATABASE_URL="$CONNECTOR_GSC_DATABASE_URL" pnpm --filter @deseo/connector-gsc db:migrate

echo "▶ Running connector-payload migrations..."
DATABASE_URL="$CONNECTOR_PAYLOAD_DATABASE_URL" pnpm --filter @deseo/connector-payload db:migrate

echo "✓ All migrations complete."
