import logger from "../../logger.js";
import { db, valkey } from "../../database.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 * @param {Object} opts
 * @param {import('common-kafka').KafkaProducer | null} [opts.kafkaProducer]
 */
export function registerShutdown(fastify, { kafkaProducer } = {}) {
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
}
