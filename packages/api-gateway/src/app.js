import Fastify from "fastify";

import logger from "./logger.js";
import { config } from "./config.js";
import { registerSwagger } from "common-swagger";
import { createMetricsPlugin } from "common-metrics";
import { Config } from "common-config";
import {
  hookAccessToken,
  hookInternalTokenInterceptor,
  hookRefreshToken,
  hookGameToken,
} from "common-auth";

import { hookRoles } from "./infrastructure/hooks/roles.hook.js";
import { apiPlugin } from "./infrastructure/plugins/api.plugin.js";
import { proxyPlugin } from "./infrastructure/plugins/proxy.plugin.js";
import { securityPlugin } from "./infrastructure/plugins/security.plugin.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    bodyLimit: 256000,
    trustProxy: true,
    routerOptions: {
      ignoreTrailingSlash: true,
    },
  });

  fastify.setErrorHandler((error, request, reply) => {
    const fastifyError = /** @type {import('fastify').FastifyError} */ (error);
    logger.error(
      {
        err: error,
        method: request.method,
        url: request.url,
        body: request.body,
        headers: request.headers,
      },
      "API Gateway Error Handler",
    );

    if (fastifyError.statusCode) {
      reply
        .status(fastifyError.statusCode)
        .send({ message: fastifyError.message });
    } else {
      reply.status(500).send({
        message: "Internal Server Error",
        detail: fastifyError.message,
      });
    }
  });

  fastify.addHook("onRequest", async (request) => {
    if (
      (request.method === "POST" || request.method === "PUT") &&
      !request.headers["content-type"]
    ) {
      request.headers["content-type"] = "application/json";
    }
  });

  await fastify.register(securityPlugin);

  fastify.addHook(
    "onRequest",
    hookAccessToken({ publicKeyPath: config.auth.access.publicKeyPath }),
  );
  fastify.addHook(
    "onRequest",
    hookRefreshToken({ publicKeyPath: config.auth.refresh.publicKeyPath }),
  );
  fastify.addHook(
    "onRequest",
    hookGameToken({ publicKeyPath: config.auth.game.publicKeyPath }),
  );
  fastify.addHook(
    "onRequest",
    hookInternalTokenInterceptor({
      privateKeyPath: config.auth.internal.privateKeyPath,
      source: "api-gateway",
      expiresIn: "30s",
    }),
  );

  fastify.addHook("preHandler", hookRoles());

  fastify.addHook("onResponse", async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime),
      },
      "request completed",
    );
  });

  fastify.addHook("onRequest", async (request) => {
    if (request.url.startsWith("/ws")) {
      const userId =
        request.gameTokenPayload?.participantId ||
        request.user?.participantId ||
        request.user?.userId;

      if (userId) {
        request.headers["x-user-id"] = String(userId);
        request.raw.headers["x-user-id"] = String(userId);
      }
      if (request.user?.role) {
        request.headers["x-user-role"] = String(request.user.role);
        request.raw.headers["x-user-role"] = String(request.user.role);
      }
    }
  });

  await fastify.register(proxyPlugin);

  const metricsEnabled = /** @type { { enabled: boolean } } */ (
    Config.get("metrics")
  ).enabled;
  await fastify.register(
    createMetricsPlugin({
      serviceName: "api-gateway",
      enabled: metricsEnabled,
    }),
  );

  await fastify.register(apiPlugin);

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "API Gateway",
    description: "Quiz Master Gateway API",
    version: "1.0.0",
  });

  return fastify;
}
