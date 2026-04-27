import Fastify from "fastify";
import logger from "./logger.js";
import { Config } from "common-config";
import { initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { createMetricsPlugin } from "common-metrics";
import { apiPlugin } from "./infrastructure/plugins/api.plugin.js";
import { kafkaPlugin } from "./infrastructure/plugins/kafka.plugin.js";
import { servicesPlugin } from "./infrastructure/plugins/services.plugin.js";
import { registerApiHooks } from "./infrastructure/hooks/api.hook.js";

/**
 * @returns {Promise<{
 *   fastify: import('./types/fastify.js').AppInstance,
 *   kafkaConsumer: import('common-kafka').KafkaConsumer | null,
 *   valkeyService: import('common-valkey').ValkeyService
 * }>}
 */
export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    routerOptions: {
      ignoreTrailingSlash: true,
    },
  });

  const metricsEnabled = /** @type {{ enabled: boolean }} */ (
    Config.get("metrics")
  ).enabled;
  await fastify.register(
    createMetricsPlugin({
      serviceName: "ms-quizz-management",
      enabled: metricsEnabled,
    }),
  );

  registerApiHooks(fastify);

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "MS Quizz Management",
    description: "Quizz Management Service API",
    version: "1.0.0",
  });

  await initDatabase();
  await fastify.register(servicesPlugin);

  await fastify.register(kafkaPlugin, { metricsEnabled });

  await fastify.register(apiPlugin);

  return {
    fastify,
    kafkaConsumer: fastify.kafkaConsumer,
    valkeyService: fastify.valkeyService,
  };
}
