#!/bin/bash
set -e

SERVICES=(
  "api-gateway-test"
  "ms-user-test"
  "ms-quizz-management-test"
  "ms-session-test"
  "ms-response-test"
)

echo "--- Starting Sequential Docker Build ---"
for service in "${SERVICES[@]}"; do
  echo "Building $service..."
  docker-compose build "$service"
done

echo "--- All test images built successfully ---"
