import "reflect-metadata";
import Fastify from "fastify";
import logger from "./logger.js";
import { initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { createMetricsPlugin } from "common-metrics";
import { Config } from "common-config";
import { apiPlugin } from "./infrastructure/plugins/api.plugin.js";
import { kafkaPlugin } from "./infrastructure/plugins/kafka.plugin.js";
import { servicesPlugin } from "./infrastructure/plugins/services.plugin.js";
import { registerApiHooks } from "./infrastructure/hooks/api.hook.js";

/**
 * @returns {Promise<{
 *   fastify: import('./types/fastify.js').AppInstance,
 *   kafkaProducer: import('common-kafka').KafkaProducer | null
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
    createMetricsPlugin({ serviceName: "ms-user", enabled: metricsEnabled }),
  );

  registerApiHooks(fastify);

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "MS User",
    description: "User Management Service API",
    version: "1.0.0",
  });

  await initDatabase();

  await fastify.register(kafkaPlugin);

  await fastify.register(servicesPlugin, {
    kafkaProducer: fastify.kafkaProducer,
  });
  await fastify.register(apiPlugin);

  return {
    fastify,
    kafkaProducer: fastify.kafkaProducer,
  };
}
