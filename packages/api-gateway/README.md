# 🌐 API Gateway (`/packages/api-gateway`)

The **API Gateway** serves as the central orchestration point and secure entry point for all external client requests arriving at the monorepo application. It acts as a reverse proxy routing external HTTP traffic bound for backend microservices securely and abstractly.

## 🎯 Primary Responsibilities

1. **Routing & Proxy Layering**: Analyzes route maps and proxies valid RESTful streams directly to `ms-user`, `ms-quiz-management`, and other internal services using fast underlying HTTP bindings.
2. **Global Authentication Enforcement**: Re-evaluates Access and Refresh Tokens provided in HTTP headers (using the asymmetric public keys mechanism provided by `common-auth` and `common-crypto`).
3. **Internal Zero-Trust Orchestration**: Valid requests are immediately re-signed. The Gateway issues an `Internal Token` encapsulating User context, which internal microservices inherently trust over any external payload.

---

## 🔐 The Authentication Workflow In Detail

Our authentication architecture strictly isolates public verifiability from internal trust:

### 1️⃣ Inbound Request Analysis
- Client pushes a request carrying the `access-token` or `refresh-token`.
- The API Gateway executes Fastify pre-handler hooks (`hookAccessToken` / `hookRefreshToken` exposed by `common-auth`).
- **Signature Verification**: Uses RSA Public Keys mapped out in config to deserialize the token.
- **Fail-Fast**: If no token is provided (and the route lacks `@Public()`), or the payload signature fails cryptographically, the Gateway intercepts the call permanently and returns `401 Unauthorized`.

### 2️⃣ Internal Token Exchange (`InternalTokenInterceptor`)
- Assuming the Access Token proves valid, the Gateway attaches the parsed metadata to the `request.user` attribute.
- Before proxying this request down to standard backend services (like `ms-user` or `ms-quiz-management`), the Gateway executes the `InternalTokenInterceptor()`.
- This interceptor constructs a completely new, short-lived **Internal JWT Token**, signed exclusively with the Gateway's **Private Key**. Its payload inherits the validated `userId`, `role`, and origin source.
- This internal token is transmitted inside an `internal-token` header natively handled by the Axios configurations (`common-axios`).

### 3️⃣ Microservice Delivery
- The routed microservice parses the proxy request.
- The microservice executes `hookInternalToken`, decoding the token via the shared Public Key, completely bypassing external validation logic. If verified, it securely exposes `request.user` on the fastify instance for local controllers.

---

## ⚙️ Key Modules

- `/src/modules/gateway/`: Defines core internal proxy rules, rate limiting (if applicable), and URL mappings.
- `/src/modules/helpers/`: Local architectural adapters for standard Controller registration using `@monorepo/common-core`.
- `/src/modules/user/`: Specific logic or specialized aggregation logic acting directly in the Gateway relating to users.

---

## 🚀 Running and Testing Commands

### Start Server
```bash
yarn workspace @monorepo/api-gateway start
```

### Run Tests Specific to API Gateway
```bash
yarn workspace @monorepo/api-gateway test
```

### Type Checking & Linting
Validate the codebase within the Gateway context:
```bash
yarn workspace @monorepo/api-gateway lint
```
