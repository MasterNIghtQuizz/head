#!/bin/bash
set -e

echo "🚀 Starting Local CI Emulator (Atomic Startup Mode)..."

# 1. Cleanup before start
echo "🧹 Cleaning previous environment..."
docker compose --profile test down -v --remove-orphans

# 2. Sequential Build (The expensive part)
echo "🏗️ Building test images sequentially..."
SERVICES=("ms-user-test" "ms-quizz-management-test" "ms-session-test" "ms-response-test" "api-gateway-test")

for service in "${SERVICES[@]}"; do
  echo "   > Building $service..."
  docker compose --profile test build "$service"
done

# 3. Start EVERYTHING at once
# Docker Compose will handle dependencies and links correctly in one go
echo "📡 Starting all services (Infra + Microservices)..."
docker compose --profile test up -d

# 4. Health Check Helper
wait_for() {
  local NAME=$1
  echo "⏳ Waiting for $NAME to become healthy..."
  
  local max_attempts=40
  local attempt=0
  
  until [ "$(docker compose --profile test ps $NAME --format "{{.Health}}")" == "healthy" ]; do
    STATUS=$(docker compose --profile test ps $NAME --format "{{.Health}}")
    # If container exited, it will never be healthy
    RUNNING=$(docker compose --profile test ps $NAME --format "{{.State}}")
    
    echo "   > $NAME current status: ${STATUS:-starting...} ($RUNNING)"
    
    if [ "$STATUS" == "unhealthy" ] || [ "$RUNNING" == "exited" ]; then
      echo "❌ Error: $NAME stopped or is unhealthy! Dumping logs:"
      docker compose --profile test logs $NAME | tail -n 50
      exit 1
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "❌ Error: $NAME timed out waiting for health check."
      docker compose --profile test logs $NAME | tail -n 50
      exit 1
    fi
    
    sleep 3
  done
  echo "✅ $NAME is healthy!"
}

# 5. Wait for all health checks
echo "🧪 Validating service health..."
wait_for postgres-test
wait_for valkey-test
wait_for ms-user-test
wait_for ms-quizz-management-test
wait_for ms-session-test
wait_for ms-response-test
wait_for api-gateway-test

# 6. Run E2E Tests
echo "🧪 Running E2E Tests..."
docker compose --profile test exec \
  api-gateway-test \
  sh ./scripts/run-e2e.sh

echo "✨ All tests passed successfully!"

# 7. Final Cleanup
echo "🧹 Final cleanup..."
docker compose --profile test down -v
