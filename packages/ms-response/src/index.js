import { initTracing } from "common-monitoring";
import { Config } from "common-config";

initTracing({
  serviceName: "ms-response",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import Fastify from "fastify";
import { fileURLToPath } from "node:url";

import logger from "./logger.js";
import { config } from "./config.js";
import { initDatabase, db } from "./database.js";
import { createMetricsPlugin } from "common-metrics";

import { TypeOrmResponseRepository } from "./modules/response/infra/persistence/typeorm-response.repository.js";
import { ResponseService } from "./modules/response/services/response.service.js";
import { ResponseController } from "./modules/response/controllers/response.controller.js";
import { QuizClient } from "./infrastructure/clients/quiz.client.js";

import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { ProcessedEventEntity } from "common-database";
import { ControllerFactory } from "common-core";

import { ResponseEventsConsumer } from "./infrastructure/kafka/consumers/response-events.consumer.js";
import { ValkeyRepository, ValkeyService } from "common-valkey";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  const metricsEnabled = /** @type {{ enabled: boolean }} */ (
    Config.get("metrics")
  ).enabled;
  await fastify.register(
    createMetricsPlugin({ serviceName: "ms-response", enabled: metricsEnabled }),
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

  await initDatabase();

  const valkeyService = new ValkeyService(config.valkey);
  if (config.valkey.enabled) {
    await valkeyService.connect();
    logger.info("Valkey connection established");
  }

  const valkeyRepository = new ValkeyRepository(valkeyService);

  const responseRepo = new TypeOrmResponseRepository(
    db.instance,
    valkeyRepository,
  );

  const quizClient = new QuizClient();
  const responseService = new ResponseService(
    responseRepo,
    valkeyRepository,
    quizClient,
  );

  ControllerFactory.register(fastify, ResponseController, [responseService]);

  /** @type {KafkaConsumer | null} */
  let kafkaConsumer = null;

  if (config.kafka.enabled) {
    const kafkaClient = createKafkaClient({
      clientId: "ms-response",
      brokers: config.kafka.brokers,
    });

    kafkaConsumer = new KafkaConsumer(kafkaClient, {
      groupId: "ms-response-group",
    });

    const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);

    new ResponseEventsConsumer(
      kafkaConsumer,
      processedEventRepo,
      responseService,
    ).register();

    await kafkaConsumer.start();
    logger.info({ groupId: "ms-response-group" }, "Kafka consumer started");
  }

  fastify.get("/health", async () => {
    return { status: "ok", service: "ms-response" };
  });

  return { fastify, kafkaConsumer, valkeyService };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fastify, kafkaConsumer, valkeyService } = await createServer();

  logger.info(
    { port: config.port, env: config.env },
    "MS Response starting...",
  );

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });

  logger.info({ port: config.port }, "Server listening");

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

    if (kafkaConsumer) {
      try {
        await kafkaConsumer.stop();
        logger.info("Kafka consumer stopped");
      } catch (err) {
        logger.error({ err }, "Error stopping Kafka consumer");
      }
    }

    try {
      await valkeyService.disconnect();
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
}
