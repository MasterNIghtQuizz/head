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

const { fastify, kafkaProducer } = await createServer();

logger.info(config, "MS Session starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });

const shutdown = async () => {
  logger.info("Gracefully shutting down ms-session...");
  await kafkaProducer?.disconnect();
  await fastify.close();
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
