import { initTracing } from "common-monitoring";
import { config } from "./config.js";

initTracing({
  serviceName: "ms-user",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import logger from "./logger.js";
import { createServer } from "./app.js";
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";

const { fastify, kafkaProducer } = await createServer();

registerShutdown(fastify, { kafkaProducer });

logger.info(config, "MS User starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
