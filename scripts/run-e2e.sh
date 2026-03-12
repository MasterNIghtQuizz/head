#!/bin/sh
set -e

export QUIZZ_SERVICE_URL="${QUIZZ_SERVICE_URL:-http://localhost:4012}"
export USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:4011}"

QUIZZ_URL="$QUIZZ_SERVICE_URL"
USER_URL="$USER_SERVICE_URL"

HEALTH_QUIZZ="${QUIZZ_URL}/health"
HEALTH_USER="${USER_URL}/health"

SEED_QUIZZ="${QUIZZ_URL}/testing/seed"
SEED_USER="${USER_URL}/testing/seed"

MAX_RETRIES="${E2E_MAX_RETRIES:-30}"
RETRY_INTERVAL="${E2E_RETRY_INTERVAL:-2}"

VALKEY_HOST="${VALKEY_HOST:-localhost}"
VALKEY_PORT="${VALKEY_PORT:-6380}"
export VALKEY_HOST VALKEY_PORT

log() { printf "\033[1;36m[e2e]\033[0m %s\n" "$1"; }
err() { printf "\033[1;31m[e2e]\033[0m %s\n" "$1"; }

http_get() {
  if command -v curl >/dev/null 2>&1; then
    curl -sf "$1" 2>/dev/null
  else
    wget -qO- "$1" 2>/dev/null
  fi
}

http_post() {
  URL="$1"
  TOKEN="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$URL" \
      -H "internal-token: ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{}"
  else
    wget -qO/dev/null -S \
      --header="internal-token: ${TOKEN}" \
      --header="Content-Type: application/json" \
      --post-data="{}" \
      "$URL" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}'
  fi
}

generate_internal_token() {
  node --input-type=module -e "
    import { CryptoService } from 'common-crypto';
    import { TokenType } from 'common-auth';
    import path from 'node:path';
    const keyPath = path.resolve(process.cwd(), 'keys/internal-private.pem');
    const token = CryptoService.sign(
      { userId: 'e2e-runner', role: 'admin', type: TokenType.INTERNAL, source: 'e2e-script' },
      keyPath,
      { expiresIn: '1h' }
    );
    process.stdout.write(token);
  "
}

wait_for_service() {
  NAME=$1
  URL=$2
  log "Waiting for $NAME at $URL..."
  attempt=0
  while [ "$attempt" -lt "$MAX_RETRIES" ]; do
    BODY=$(http_get "$URL" || true)
    if echo "$BODY" | grep -q "ok"; then
      log "$NAME is UP ✓"
      return 0
    fi
    attempt=$((attempt + 1))
    log "  Attempt ${attempt}/${MAX_RETRIES} — retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
  done
  err "$NAME did not respond after ${MAX_RETRIES} attempts."
  return 1
}

wait_for_service "ms-quizz-management" "$HEALTH_QUIZZ"
wait_for_service "ms-user" "$HEALTH_USER"

log "Step 2/3 — Seeding databases..."
INTERNAL_TOKEN=$(generate_internal_token)

seed_service() {
  NAME=$1
  URL=$2
  log "Seeding $NAME..."
  HTTP_CODE=$(http_post "$URL" "$INTERNAL_TOKEN" || echo "000")
  if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    log "$NAME seeded successfully ✓"
    return 0
  fi
  err "Failed to seed $NAME (HTTP $HTTP_CODE)"
  return 1
}

seed_service "ms-quizz-management" "$SEED_QUIZZ"
seed_service "ms-user" "$SEED_USER"

log "Step 3/3 — Running E2E tests..."
exec yarn vitest run --config vitest.config.e2e.js --no-file-parallelism --maxWorkers=1 --dir packages/api-gateway "$@"
