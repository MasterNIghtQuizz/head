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
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";

const { fastify, kafkaProducer, kafkaConsumer } = await createServer();

registerShutdown(fastify, { kafkaProducer, kafkaConsumer });

logger.info({ port: config.port, env: config.env }, "MS Session starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
