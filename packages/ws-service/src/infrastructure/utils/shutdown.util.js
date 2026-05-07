import logger from "../../logger.js";

/**
 * @param {import('../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {import('ws').WebSocketServer} opts.wss
 * @param {import('common-kafka').KafkaConsumer | null} opts.kafkaConsumer
 * @param {import('../../infrastructure/valkey/consumers/session-notifications.consumer.js').SessionNotificationsConsumer | null} opts.valkeyConsumer
 */
export function registerShutdown(fastify, { wss, kafkaConsumer, valkeyConsumer }) {
  let shuttingDown = false;

  const shutdown = async (/** @type {string} */ signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "Starting graceful shutdown...");

    try {
      await new Promise((resolve, reject) => {
        wss.close((err) => {
          if (err) reject(err);
          else resolve(null);
        });
      });
      logger.info("WebSocket server closed");
    } catch (err) {
      logger.error({ err }, "Error closing WebSocket server");
    }

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

    if (valkeyConsumer) {
      try {
        await valkeyConsumer.stop();
        logger.info("Valkey consumer stopped");
      } catch (err) {
        logger.error({ err }, "Error stopping Valkey consumer");
      }
    }

    logger.info("Shutdown complete. Exiting.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
