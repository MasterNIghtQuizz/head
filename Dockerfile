# syntax=docker/dockerfile:1

FROM node:24-slim AS base
ENV YARN_VERSION=4.11.0
RUN corepack enable && corepack prepare yarn@$YARN_VERSION --activate
WORKDIR /app

FROM base AS dependencies
COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./

COPY packages/common/auth/package.json ./packages/common/auth/
COPY packages/common/axios/package.json ./packages/common/axios/
COPY packages/common/config/package.json ./packages/common/config/
COPY packages/common/contracts/package.json ./packages/common/contracts/
COPY packages/common/core/package.json ./packages/common/core/
COPY packages/common/crypto/package.json ./packages/common/crypto/
COPY packages/common/database/package.json ./packages/common/database/
COPY packages/common/errors/package.json ./packages/common/errors/
COPY packages/common/kafka/package.json ./packages/common/kafka/
COPY packages/common/logger/package.json ./packages/common/logger/
COPY packages/common/swagger/package.json ./packages/common/swagger/
COPY packages/common/valkey/package.json ./packages/common/valkey/
COPY packages/common/monitoring/package.json ./packages/common/monitoring/
COPY packages/common/metrics/package.json ./packages/common/metrics/
COPY packages/api-gateway/package.json ./packages/api-gateway/
COPY packages/ms-user/package.json ./packages/ms-user/
COPY packages/ms-quizz-management/package.json ./packages/ms-quizz-management/
COPY packages/common/websocket/package.json ./packages/common/websocket/
COPY packages/ws-service/package.json ./packages/ws-service/
COPY packages/ms-session/package.json ./packages/ms-session/
COPY packages/ms-response/package.json ./packages/ms-response/


RUN yarn install --immutable


FROM dependencies AS builder
COPY . .

FROM base AS runner
ARG SERVICE_NAME
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE_NAME}


COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml

RUN if [ -z "$SERVICE_NAME" ]; then echo "SERVICE_NAME build arg is required"; exit 1; fi

EXPOSE 3000

USER node

CMD ["/bin/sh", "-c", "yarn workspace @monorepo/${SERVICE_NAME} start"]
