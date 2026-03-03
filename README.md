# Quiz Master Monorepo

Welcome to the **Quiz Master Monorepo**. This project is a Yarn workspace-based monorepo using **Yarn v4.11.0** and **Node.js 24**.
It follows a Microservices Architecture governed by Domain-Driven Design (DDD) principles and leverages Fastify for high-performance HTTP routing.

## 🏗 Architecture Overview

The system consists of an API Gateway and multiple internal microservices communicating via HTTP/JSON.

- **`api-gateway`**: The single public-facing entry point, acting as a reverse proxy, aggregator, and global authenticator.
- **`ms-user`**: A microservice that manages user profiles, registration, and user-centric data.
- **`ms-quizz-management`**: A microservice dedicated to managing quizzes, questions, and choices.
- **`common/*`**: Shared libraries standardizing core behaviors like logging, authentication, database access, and error handling across all services.

## 🔐 Authentication & Security Workflow

Our security model incorporates a unified authentication flow, relying on asymmetric cryptography (RSA Keys) to sign and verify tokens:

1. **Access Tokens & Refresh Tokens**:
   - The user authenticates against the gateway (which may delegate to `ms-user`).
   - The gateway issues an **Access Token** (short-lived) and a **Refresh Token** (long-lived).
2. **Gateway Verification**:
   - The API Gateway uses `common-auth` to decode and verify the incoming purely on the Gateway layer using hooks (`hookAccessToken` / `hookRefreshToken`).
   - If invalid or missing on a protected route, the Gateway immediately responds with a `401 Unauthorized` without ever reaching the microservices.
3. **Internal Tokens**:
   - When the Gateway propagates a valid request to a Microservice, it generates an **Internal Token** (signed with its private key) via the `InternalTokenInterceptor` provided by `common-auth`.
   - The Microservice transparently intercepts the request, validates the Internal Token using `hookInternalToken`, and reconstructs the `request.user` context payload.
   - This ensures **Zero-Trust** within the cluster: Microservices only answer requests demonstrably originating from the authorized Gateway or legitimate Internal services.

## 📦 Project Structure

### `/packages/common`
Shared libraries providing cross-cutting concerns.
- **`common-auth`**: Fastify hooks & TS typings for token verification and internal token interception.
- **`common-core`**: Foundational classes (Controllers, Services), Decorators (e.g., `@Public()`, `@Schema()`), and core helpers.
- **`common-crypto`**: Cryptographic utility wrappers and token signing/verifying functions.
- **`common-logger`**: Pino-based high-performance JSON logger.
- **`common-database`**: Standardized Sequelize/TypeORM configurations and generic connection handling.
- **`common-errors`**: Global custom error classes (e.g., `NotFoundError`) and Fastify error handlers.
- **`common-axios`**: Pre-configured Axios instances for inter-service communication.
- **`common-swagger`**: OpenAPI generators utilizing Fastify-Swagger.
- **`common-config`**: Configuration validation relying on config/joi.

*(See `packages/common/README.md` for more details on internal libraries)*

### `/packages/api-gateway`
- **Purpose**: Fastify-based orchestrator. Validates external JWTs and mints Internal Tokens before proxying API requests to `ms-*` destinations.
*(See `packages/api-gateway/README.md` for full implementation details)*

### `/packages/ms-*`
- **Purpose**: Domain-specific microservices encapsulating their own databases (PostgreSQL/Sequelize).

## 🚀 Getting Started

### Prerequisites

This project utilizes Yarn 4 via Corepack:
```bash
corepack enable
yarn set version 4.11.0
```

### Installation

Install all monorepo dependencies:
```bash
yarn install
```

### 🏃 Running Locally

**With Docker Compose (Recommended):**
The easiest way to bootstrap the databases alongside the services:
```bash
docker-compose up --build
```
*Note: Make sure port 5432 is free on your host, or configure `docker-compose.yml` accordingly.*

**Manual Start (Development):**
You can launch the applications simultaneously using `concurrently`:
```bash
yarn start
```
Or individually:
```bash
yarn workspace @monorepo/api-gateway start
yarn workspace @monorepo/ms-user start
yarn workspace @monorepo/ms-quizz-management start
```

## 🧪 Testing & Quality Assurance

We use **Vitest** for our fast, native execution test suite, alongside **ESLint** and **Prettier** for code formatting.

### Useful Commands

- **Run all tests**:
  ```bash
  yarn test
  ```
- **Run Unit Tests exclusively**:
  ```bash
  yarn test:unit
  ```
- **Run Integration Tests exclusively**:
  ```bash
  yarn test:int
  ```
- **Generate Coverage Report** (Excludes config and useless files):
  ```bash
  yarn vitest run --coverage
  ```
- **Run Linter**:
  ```bash
  yarn lint
  ```

## 🛠 Infrastructure Details
- **Database**: PostgreSQL 16
- **Routing**: Fastify v5
- **Testing**: Vitest v4
- **Language**: Node 24 (ESM Modules, Mixed JS/TS)
