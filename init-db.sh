#!/bin/bash
set -e

DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres_password}
export PGPASSWORD=$DB_PASSWORD

if [ -f /.dockerenv ]; then
  DB_HOST=""
  DB_PORT=""
else
  DB_HOST=${POSTGRES_HOST:-localhost}
  DB_PORT=${POSTGRES_PORT:-5434}
fi

create_db_if_not_exists() {
  local db=$1
  local ARGS="-U $DB_USER -d postgres"

  if [ -n "$DB_HOST" ]; then
    ARGS="$ARGS -h $DB_HOST -p $DB_PORT"
  fi

  echo "Checking database '$db'..."

  local exists
  exists=$(psql $ARGS -t -Ac "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null || echo "0")

  if [ "$exists" = "1" ]; then
    echo "Database '$db' already exists. Skipping."
  else
    echo "Creating database '$db'..."
    psql $ARGS -c "CREATE DATABASE $db"
  fi
}

DATABASES=(
  "ms_user_db"
  "ms_quizz_db"
  "ms_session_db"
  "ms_user_test_db"
  "ms_quizz_test_db"
  "ms_session_test_db"
  "ms_response_db"
  "ms_response_test_db"
)

for db in "${DATABASES[@]}"; do
  create_db_if_not_exists "$db"
done

echo "All databases initialized successfully."
