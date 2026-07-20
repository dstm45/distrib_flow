#!/bin/sh
set -e

echo "Waiting for database hostname resolution..."
# Try resolving both service name (db) and container name (df_db)
until nslookup db >/dev/null 2>&1 || nslookup df_db >/dev/null 2>&1; do
  echo "Database host not resolved yet. Retrying in 1s..."
  sleep 1
done

echo "Running database migrations using goose..."
MAX_TRIES=10
TRY=1
until goose -dir ./pkg/database/migrations postgres "$DATABASE_URI" up; do
  if [ $TRY -ge $MAX_TRIES ]; then
    echo "Failed to run migrations after $MAX_TRIES attempts. Exiting."
    exit 1
  fi
  echo "Migration failed (attempt $TRY/$MAX_TRIES). Database might still be initializing network bindings. Retrying in 2s..."
  sleep 2
  TRY=$((TRY+1))
done

echo "Migrations completed successfully. Starting Go API server..."
exec ./distrib_flow
