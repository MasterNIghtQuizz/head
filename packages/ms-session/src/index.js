import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";

const fastify = Fastify({ loggerInstance: logger });

fastify.addHook(
  "onRequest",
  hookInternalToken({
    publicKeyPath: config.auth.internal.publicKeyPath,
  }),
);

fastify.get("/health", { config: { isPublic: true } }, async () => {
  return { status: "ok", service: "ms-user" };
});

import { ControllerFactory } from "common-core";
import { UserController } from "./modules/user/controllers/user.controller.js";
import { UserService } from "./modules/user/services/user.service.js";
import { createKafkaClient, KafkaProducer } from "common-kafka";

// @ts-ignore
await registerSwagger(fastify, {
  title: "MS User",
  description: "User Management Service API",
  version: "1.0.0",
});

await initDatabase();

const kafkaClient = createKafkaClient({
  clientId: "ms-user",
  brokers: config.kafka.brokers,
});
const kafkaProducer = new KafkaProducer(kafkaClient);
await kafkaProducer.connect();

const userService = new UserService(kafkaProducer);
ControllerFactory.register(fastify, UserController, [userService]);

logger.info(config, "MS User starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });

const shutdown = async () => {
  logger.info("Gracefully shutting down ms-user...");
  await kafkaProducer.disconnect();
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
