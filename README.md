# Quiz Master Monorepo

This project is a Yarn workspace-based monorepo using **Yarn v4.11.0** and **Node.js 24**.
It follows Hexagonal Architecture and Domain-Driven Design (DDD) principles.

## Prerequisites

This project uses Yarn 4.11.0 via Corepack.

```bash
corepack enable
yarn set version 4.11.0
```

## Architecture

The system consists of an API Gateway and several microservices:

- **api-gateway**: Entry point, routing requests to microservices.
- **ms-user**: Manages user profiles and authentication.
- **ms-quizz-management**: Manages quizzes, questions, and choices.

## Project Structure

### `packages/common`

- **common-logger**: Standardized logging based on Pino.
- **common-config**: Centralized configuration management with Joi validation.

### `packages/api-gateway`

- **Package name**: `@monorepo/api-gateway`
- **Purpose**: Fastify-based gateway for microservice coordination.

### `packages/ms-user`

- **Package name**: `@monorepo/ms-user`
- **Purpose**: User management service with PostgreSQL integration.

### `packages/ms-quizz-management`

- **Package name**: `@monorepo/ms-quizz-management`
- **Purpose**: Quiz management service with PostgreSQL integration.

## Getting Started

### Installation

```bash
yarn install
```

### Running with Docker

The entire stack, including PostgreSQL, can be started using Docker Compose:

```bash
docker-compose up --build
```

### Manual Start

```bash
yarn workspace @monorepo/api-gateway start
yarn workspace @monorepo/ms-user start
yarn workspace @monorepo/ms-quizz-management start
```

## Infrastructure

- **Database**: PostgreSQL 16 (Shared instance with service-specific schemas recommended).
- **Communication**: HTTP/JSON (Fastify).
- **Configuration**: JSON files (`default.json`, `custom-environment-variables.json`).
- **Validation**: Joi.
