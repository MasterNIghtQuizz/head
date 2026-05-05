import Fastify from "fastify";
import logger from "./logger.js";
import { registerSwagger } from "common-swagger";
import { createMetricsPlugin } from "common-metrics";
import { Config } from "common-config";
import { registerApiHooks } from "./infrastructure/hooks/api.hook.js";
import { kafkaPlugin } from "./infrastructure/plugins/kafka.plugin.js";
import { servicesPlugin } from "./infrastructure/plugins/services.plugin.js";
import { apiPlugin } from "./infrastructure/plugins/api.plugin.js";
import { initDatabase } from "./database.js";

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
    createMetricsPlugin({ serviceName: "ms-session", enabled: metricsEnabled }),
  );

  registerApiHooks(fastify);

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "MS Session",
    description: "Session Management Service API",
    version: "1.0.0",
  });

  await initDatabase();

  await fastify.register(kafkaPlugin, { metricsEnabled });

  await fastify.register(servicesPlugin, {
    kafkaProducer: fastify.kafkaProducer,
    kafkaConsumer: fastify.kafkaConsumer,
  });
  await fastify.register(apiPlugin);

  return {
    fastify,
    kafkaProducer: fastify.kafkaProducer,
    kafkaConsumer: fastify.kafkaConsumer,
  };
}
