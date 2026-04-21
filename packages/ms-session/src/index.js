import { initTracing } from "common-monitoring";
import { config } from "./config.js";

initTracing({
  serviceName: "ms-session",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import "reflect-metadata";
import logger from "./logger.js";
import { createServer } from "./app.js";
import { db, valkey } from "./database.js";

const { fastify, kafkaProducer, kafkaConsumer } = await createServer();

logger.info({ port: config.port, env: config.env }, "MS Session starting...");

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

  if (kafkaConsumer) {
    try {
      await kafkaConsumer.stop();
      logger.info("Kafka consumer stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping Kafka consumer");
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
