#!/bin/sh
set -e

export QUIZZ_SERVICE_URL="${QUIZZ_SERVICE_URL:-http://localhost:4012}"
QUIZZ_URL="$QUIZZ_SERVICE_URL"
HEALTH_ENDPOINT="${QUIZZ_URL}/health"
SEED_ENDPOINT="${QUIZZ_URL}/testing/seed"
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

log "Step 1/3 — Waiting for ms-quizz-management at ${HEALTH_ENDPOINT}..."

attempt=0
while [ "$attempt" -lt "$MAX_RETRIES" ]; do
  BODY=$(http_get "$HEALTH_ENDPOINT" || true)
  if echo "$BODY" | grep -q "ok"; then
    log "ms-quizz-management is UP ✓"
    break
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_RETRIES" ]; then
    err "ms-quizz-management did not respond after ${MAX_RETRIES} attempts. Aborting E2E tests."
    exit 1
  fi
  log "  Attempt ${attempt}/${MAX_RETRIES} — retrying in ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

log "Step 2/3 — Seeding database..."
INTERNAL_TOKEN=$(generate_internal_token)

seed_attempt=0
while [ "$seed_attempt" -lt "$MAX_RETRIES" ]; do
  HTTP_CODE=$(http_post "$SEED_ENDPOINT" "$INTERNAL_TOKEN" || echo "000")

  if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    log "Database seeded successfully (HTTP ${HTTP_CODE}) ✓"
    break
  fi

  seed_attempt=$((seed_attempt + 1))
  if [ "$seed_attempt" -ge "$MAX_RETRIES" ]; then
    err "Failed to seed database after ${MAX_RETRIES} attempts (last HTTP: ${HTTP_CODE}). Aborting."
    exit 1
  fi
  log "  Seed attempt ${seed_attempt}/${MAX_RETRIES} failed (HTTP ${HTTP_CODE}) — retrying in ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

log "Step 3/3 — Running E2E tests..."
exec yarn vitest run --config vitest.config.e2e.js --no-file-parallelism --maxWorkers=1 --dir packages/api-gateway "$@"
