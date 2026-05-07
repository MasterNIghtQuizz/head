import Fastify from "fastify";
import logger from "./logger.js";
import { config } from "./config.js";
import { createMetricsPlugin } from "common-metrics";
import { websocketPlugin } from "./infrastructure/plugins/websocket.plugin.js";
import { kafkaPlugin } from "./infrastructure/plugins/kafka.plugin.js";
import { valkeyPlugin } from "./infrastructure/plugins/valkey.plugin.js";
import { WebSocketServer } from "ws";

/**
 * @returns {Promise<{
 *   fastify: import('./types/fastify.js').AppInstance,
 *   wss: WebSocketServer,
 *   kafkaConsumer: import('common-kafka').KafkaConsumer | null,
 *   valkeyConsumer: import('./infrastructure/valkey/consumers/session-notifications.consumer.js').SessionNotificationsConsumer | null
 * }>}
 */
export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  // Metrics
  await fastify.register(
    createMetricsPlugin({
      serviceName: "ws-service",
      enabled: config.metrics.enabled,
    }),
  );

  // Plugins
  await fastify.register(kafkaPlugin);
  await fastify.register(valkeyPlugin);
  await fastify.register(websocketPlugin);

  // Health check
  fastify.get("/health", async () => {
    return { status: "ok", service: "ws-service" };
  });

  return {
    fastify,
    wss: fastify.wss,
    kafkaConsumer: fastify.kafkaConsumer,
    valkeyConsumer: fastify.valkeyConsumer,
  };
}
