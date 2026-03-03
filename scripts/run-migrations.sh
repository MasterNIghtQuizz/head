#!/bin/bash

echo "Running migrations for all microservices..."

echo "----------------------------------------"
echo "MS-USER"
yarn workspace @monorepo/ms-user run migrations:run

echo "----------------------------------------"
echo "MS-QUIZZ-MANAGEMENT"
yarn workspace @monorepo/ms-quizz-management run migrations:run

echo "----------------------------------------"
echo "All migrations completed."
