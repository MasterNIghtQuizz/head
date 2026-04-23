#!/bin/bash

echo "Running migrations for all microservices..."

echo "----------------------------------------"
echo "MS-USER"
yarn workspace @monorepo/ms-user run migrations:run

echo "----------------------------------------"
echo "MS-QUIZZ-MANAGEMENT"
yarn workspace @monorepo/ms-quizz-management run migrations:run

echo "----------------------------------------"
echo "MS-SESSION"
yarn workspace @monorepo/ms-session run migrations:run

echo "----------------------------------------"
echo "MS-RESPONSE"
yarn workspace @monorepo/ms-response run migrations:run

echo "----------------------------------------"
echo "All migrations completed."
