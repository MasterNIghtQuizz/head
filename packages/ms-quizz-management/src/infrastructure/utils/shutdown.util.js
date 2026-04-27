import logger from "../../logger.js";
import { db } from "../../database.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 * @param {Object} opts
 * @param {import('common-kafka').KafkaConsumer | null} [opts.kafkaConsumer]
 * @param {import('common-valkey').ValkeyService} opts.valkeyService
 */
export function registerShutdown(fastify, { kafkaConsumer, valkeyService }) {
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
