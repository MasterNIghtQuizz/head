import { initTracing } from "common-monitoring";
import { config } from "./config.js";
import { Config } from "common-config";

initTracing({
  serviceName: "ms-user",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import "reflect-metadata";
import Fastify from "fastify";
import logger from "./logger.js";
import { initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ControllerFactory } from "common-core";
import { createMetricsPlugin } from "common-metrics";
import { UserController } from "./modules/user/controllers/user.controller.js";
import { TestingController } from "./modules/user/controllers/testing.controller.js";
import { UserService } from "./modules/user/services/user.service.js";
import { createKafkaClient, KafkaProducer } from "common-kafka";
import { TypeOrmUserRepository } from "./modules/user/infra/persistence/typeorm-user.repository.js";
import { ValkeyRepository } from "common-valkey";
import { db, valkey } from "./database.js";

const fastify = Fastify({
  loggerInstance: logger,
  disableRequestLogging: true,
  ignoreTrailingSlash: true,
});

const metricsEnabled = /** @type {{ enabled: boolean }} */ (
  Config.get("metrics")
).enabled;
await fastify.register(
  createMetricsPlugin({ serviceName: "ms-user", enabled: metricsEnabled }),
);

fastify.addHook(
  "onRequest",
  hookInternalToken({
    publicKeyPath: config.auth.internal.publicKeyPath,
  }),
);

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

// @ts-ignore
await registerSwagger(fastify, {
  title: "MS User",
  description: "User Management Service API",
  version: "1.0.0",
});

await initDatabase();

/** @type {import('common-kafka').KafkaProducer | null} */
let kafkaProducer = null;
if (config.kafka.enabled) {
  const kafkaClient = createKafkaClient({
    clientId: "ms-user",
    brokers: config.kafka.brokers,
  });
  kafkaProducer = new KafkaProducer(kafkaClient);
  try {
    await kafkaProducer.connect();
  } catch (error) {
    logger.error(
      { error },
      "Kafka connection failed. Service will start without Kafka producer.",
    );
  }
}

const valkeyRepository = new ValkeyRepository(valkey);
const userRepository = new TypeOrmUserRepository(
  db.instance,
  valkeyRepository,
  config.security.encryptionKey,
);

const userService = new UserService(kafkaProducer, userRepository);
ControllerFactory.register(fastify, UserController, [userService]);

ControllerFactory.register(fastify, TestingController, []);

logger.info(config, "MS User starting...");

fastify.get("/health", { config: { isPublic: true } }, async () => {
  return { status: "ok", service: "ms-user" };
});
await fastify.listen({ host: "0.0.0.0", port: config.port });

let shuttingDown = false;
const shutdown = async (/** @type {string} */ signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "Starting graceful shutdown...");

  try {
    await fastify.close();
    logger.info("HTTP server closed");
  } catch (err) {
    logger.error({ err }, "Error closing HTTP server");
  }

  if (kafkaProducer) {
    try {
      await kafkaProducer.disconnect();
      logger.info("Kafka producer disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Kafka producer");
    }
  }

  try {
    await valkey.disconnect();
    logger.info("Valkey disconnected");
  } catch (err) {
    logger.error({ err }, "Error disconnecting Valkey");
  }

  try {
    await db.disconnect();
    logger.info("Database connection closed");
  } catch (err) {
    logger.error({ err }, "Error closing database connection");
  }

  logger.info("Shutdown complete. Exiting.");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
