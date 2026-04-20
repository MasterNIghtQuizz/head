#!/bin/bash
set -e

echo "🚀 Starting Local CI Emulator..."

# 1. Cleanup before start
echo "🧹 Cleaning previous environment..."
docker compose --profile test down -v --remove-orphans

# 2. Build
echo "🏗️ Building test images..."
docker compose --profile test build \
  api-gateway-test \
  ms-user-test \
  ms-quizz-management-test \
  ms-session-test

# 3. Start Infrastructure
echo "📡 Starting infrastructure..."
docker compose --profile test up -d \
  postgres-test \
  valkey-test \
  ms-user-test \
  ms-quizz-management-test \
  ms-session-test

# 4. Health Checks
wait_for() {
  local NAME=$1
  echo "⏳ Waiting for $NAME to become healthy..."
  until [ "$(docker compose --profile test ps $NAME --format "{{.Health}}")" == "healthy" ]; do
    STATUS=$(docker compose --profile test ps $NAME --format "{{.Health}}")
    echo "   > $NAME current status: ${STATUS:-starting...}"
    if [ "$STATUS" == "unhealthy" ]; then
      echo "❌ Error: $NAME is unhealthy! Check logs below:"
      docker compose --profile test logs $NAME
      exit 1
    fi
    sleep 3
  done
  echo "✅ $NAME is healthy!"
}

wait_for ms-user-test
wait_for ms-quizz-management-test
wait_for ms-session-test

# 5. Run E2E Tests
echo "🧪 Running E2E Tests..."
docker compose --profile test run \
  --rm \
  --no-deps \
  -e USER_SERVICE_URL=http://ms-user-test:4011 \
  -e QUIZZ_SERVICE_URL=http://ms-quizz-management-test:4012 \
  -e SESSION_SERVICE_URL=http://ms-session-test:4013 \
  api-gateway-test \
  sh ./scripts/run-e2e.sh

echo "✨ All tests passed successfully!"

# 6. Final Cleanup
echo "🧹 Final cleanup..."
docker compose --profile test down -v
