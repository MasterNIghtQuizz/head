# Quiz Master Monorepo

Welcome to the **Quiz Master Monorepo**. This project is a Yarn workspace-based monorepo using **Yarn v4.11.0** and **Node.js 24**.
It follows a Microservices Architecture governed by Domain-Driven Design (DDD) principles and leverages Fastify for high-performance HTTP routing.

## 🏗 Architecture Overview

The system consists of an API Gateway and multiple internal microservices communicating synchronously via HTTP/JSON, and asynchronously via strictly typed **Kafka** events.

- **`api-gateway`**: The single public-facing entry point, acting as a reverse proxy, aggregator, and global authenticator.
- **`ms-user`**: A microservice that manages user profiles, registration, and user-centric data.
- **`ms-quizz-management`**: A microservice dedicated to managing quizzes, questions, and choices. Features CRUD operations, bulk question retrieval, and quiz-specific filtering.
- **`common/*`**: Shared libraries standardizing core behaviors like logging, authentication, database access, messaging, and error handling across all services.

## 🧱 Service Features (MS Quizz Management)

The `ms-quizz-management` service provides:

- **Full CRUD** for Quizzes, Questions, and Choices.
- **Bonus Operations**:
  - `getQuestionsByQuizId(quizId)`: Retrieve all questions belonging to a specific quiz, ordered by its `order_index`.
  - `getQuestionsByIds(ids[])`: Bulk retrieve questions by id.
  - `getChoicesByQuestionId(questionId)`: Retrieve all choices for a specific question.

## 🚨 Error Handling Strategy

All services utilize the `common-errors` shared library to ensure consistent API responses:

- **`BaseError`**: Standardized JSON structure for all application errors.
- **Domain-Specific Errors**: Located in `./errors` folders (e.g., `QUIZ_NOT_FOUND`).
- **Postgres Integration**: Services catch DB-specific errors (e.g., unique constraint violations) and map them to `ConflictError` (409) or `InternalServerError` (500).

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

## 📡 Event-Driven Architecture & Idempotency

To decouple microservices and guarantee data consistency without distributed transactions, we use **Apache Kafka** for asynchronous communication. This ensures highly scalable, fault-tolerant event streaming across domains.

### 📝 1. Producers & Topics

Microservices that dictate domain changes act as **Producers**.
For instance, when a new user registers in `ms-user`, it triggers a producer to publish a strictly typed event (e.g., `USER_CREATED`) to the `user.events` topic. We have enabled `idempotence: true` on the Kafka client itself to prevent network retries from polluting the topic.

### 🎧 2. Consumers & Exactly-Once Processing

Subscribing microservices (e.g., `ms-quizz-management`) act as **Consumers** that react to these domain topics. Due to the nature of distributed systems, at-least-once delivery is the standard. This means a consumer might receive the same message multiple times.

To protect against this, we implemented robust **Consumer-Side Idempotency**:

- Every message distributed via Kafka contains a strictly unique `eventId` (UUID).
- Before processing an event payload, the consumer queries a shared `processed_events` PostgreSQL table (managed via TypeORM's `ProcessedEventEntity`).
- If the `eventId` already exists, the event is immediately discarded/skipped, preventing side-effect duplication.
- If the `eventId` is new, the business logic runs and the `eventId` is recorded in the same database transaction, ensuring atomic **Exactly-Once** semantics.

### 🔄 3. Database Consistency

We rely on **TypeORM** automated migrations (`yarn migrations:run`) to ensure that the `processed_events` table exists and is synchronized across all domains that implement Kafka listeners.

## 📊 Monitoring & Observability

The project integrates a complete observability stack for distributed tracing and log centralization via **OpenTelemetry**.

### 🛠 Monitoring Architecture
- **OpenTelemetry (OTEL)**: Collects traces and logs from all microservices.
- **Jaeger**: Used for visualizing request paths through services (Tracing).
- **OpenSearch**: Search and analytics engine for centralized log storage.
- **OpenSearch Dashboards**: Visualization interface for logs (equivalent to Kibana).

### 🔗 Service Links
- **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
- **OpenSearch Dashboards**: [http://localhost:5601](http://localhost:5601)
- **OpenSearch API**: [http://localhost:9200](http://localhost:9200)

### 🚀 Running with Monitoring
To enable data exportation and start the full monitoring infrastructure:

```bash
MONITORING_ENABLED=true docker compose --profile app --profile monitoring up -d
```

> [!TIP]
> Setting `MONITORING_ENABLED=true` tells the services to send their data to the OTEL collector. The `monitoring` profile starts the OpenSearch and Jaeger containers.

## 📦 Project Structure

### `/packages/common`

Shared libraries providing cross-cutting concerns.

- **`common-auth`**: Fastify hooks & TS typings for token verification and internal token interception.
- **`common-core`**: Foundational classes (Controllers, Services), Decorators (e.g., `@Public()`, `@Schema()`), and core helpers.
- **`common-crypto`**: Cryptographic utility wrappers and token signing/verifying functions.
- **`common-logger`**: Pino-based high-performance JSON logger.
- **`common-database`**: Standardized **TypeORM** / PostgreSQL configurations, migrations runner, and shared entities (e.g., `ProcessedEventEntity`).
- **`common-kafka`**: Typed wrappers for Kafka consumer/producer with built-in idempotency logic and graceful disconnects.
- **`common-errors`**: Global custom error classes (e.g., `NotFoundError`) and Fastify error handlers.
- **`common-axios`**: Pre-configured Axios instances for inter-service communication.
- **`common-swagger`**: OpenAPI generators utilizing Fastify-Swagger.
- **`common-config`**: Configuration validation relying on config/joi.
- **`common-monitoring`**: OpenTelemetry setup for tracing and OpenSearch integration for log centralization.

_(See `packages/common/README.md` for more details on internal libraries)_

### `/packages/api-gateway`

- **Purpose**: Fastify-based orchestrator. Validates external JWTs and mints Internal Tokens before proxying API requests to `ms-*` destinations.
  _(See `packages/api-gateway/README.md` for full implementation details)_

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
docker compose --profile infra up -d
# Start services in docker
docker compose --profile app up -d

# Start services with full monitoring (OpenSearch + Tracing)
MONITORING_ENABLED=true docker compose --profile app --profile monitoring up -d
```

_Note: Make sure port 5432 is free on your host, or configure `docker-compose.yml` accordingly._

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
- **Run End-to-End (E2E) Tests**:
  E2E tests require a fully functional localized environment (databases, cache, microservices). We use a dedicated Docker Compose profile (`test`) to spin up isolated containers before running the tests.

  ```bash
  # 1. Build and start the test environment (detached mode)
  docker compose --profile test up -d --build

  # 2. Run the E2E test script
  yarn test:e2e

  # 3. Tear down the test environment when finished
  docker compose --profile test down -v
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

- **Database**: PostgreSQL 16 (via TypeORM)
- **Event Broker**: Apache Kafka
- **Routing**: Fastify v5
- **Testing**: Vitest v4
- **Language**: Node 24 (ESM Modules, Mixed JS/TS)
