# 🧩 Common Libraries (`/packages/common`)

This directory contains strictly isolated, reusable modules intended to be consumed by the API Gateway and the Microservices. They help establish a **shared ground** across the monorepo to avoid business-logic duplication and ensure structural consistency.

We follow Domain-Driven Design (DDD) principles where applicable, ensuring these libraries are as strictly scoped as possible.

## 📚 Library Breakdown

### 1. `common-auth`
Provides Authentication schemas and hooks.
- **Fastify Hooks**: Contains `hookAccessToken`, `hookRefreshToken`, and `hookInternalToken`. These intercept requests to validate asymmetric JWT signatures before the request hits standard route handlers.
- **Type Augmentations**: Extends `@fastify/request` by attaching type-safe `.user`, `.refreshTokenPayload`, and `.internalTokenPayload` objects based on validated JWT definitions.
- **Internal Interceptor**: Provides `InternalTokenInterceptor` to sign new requests automatically with a short-lived internal JWT before the API Gateway forwards requests to microservices.

### 2. `common-core`
A foundation package offering class inheritance and decorators intended for routing logic integration.
- **Base Classes**: Base Controller, Service, and Repository interfaces to standardize error propagation and method signatures.
- **Decorators**: Declarative fastify-specific decorators like `@Public()`, `@Schema()`, and others used locally within services.

### 3. `common-crypto`
Wrapper over standard Node.js `crypto` & `jsonwebtoken` handling.
- Implements `CryptoService` for symmetric and asymmetric Key generation/verification, hashing operations, etc.
- Standardizes token decoding and signature validation.

### 4. `common-database`
Provides the `DatabaseConfig` schemas for relational DB connection via Sequelize or equivalent.
- Abstract generic DB logic, model loading patterns, and connections configurations used across microservices.

### 5. `common-errors`
Centralized dictionary for handling standardized HTTP API Exceptions.
- `NotFoundError`, `UnauthorizedError`, `InternalServerError`, etc.
- Automatically handles Fastify `onError` / `setErrorHandler` bindings to properly serialize our Custom Errors back to standard `RFC 7807` JSON Problem details.

### 6. `common-logger`
Built atop `pino`.
- Provides a fast, opinionated JSON logging solution.
- Standardizes bindings so each microservice logs natively with its service name context attached.

### 7. `common-axios`
Provides custom pre-configured `axios` instances.
- Handles default timeouts, request proxying, and attaching internal trace tokens (from `common-auth`) when communicating between internal nodes.

### 8. `common-swagger`
Automates OpenAPI / Swagger generation.
- Handles wrapping the Fastify-Swagger plugin globally and registers components dynamically depending on the microservice loading it.

### 9. `common-config`
Extensible typed configurations.
- Schema verification using `Joi` specifically tailored for parsing `.json` or environment variables strictly.

---

## 💻 Commands for the Common Workspace

If you ever add a new library inside `/common`:
1. Use standard JS Modules (`"type": "module"`).
2. Wire up the internal typescript typings where appropriate.
3. Don't forget to declare external peerDependencies if your common block extends things arbitrarily (like Fastify).

Run tests across all common libs specifically:
```bash
yarn workspace common-* test
```
