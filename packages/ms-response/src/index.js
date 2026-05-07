import { fileURLToPath } from "node:url";
import { initTracing } from "common-monitoring";
import { config } from "./config.js";
import { createServer } from "./app.js";
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";
import logger from "./logger.js";

initTracing({
  serviceName: "ms-response",
  enabled: config.otel?.enabled ?? false,
  exporterUrl: config.otel?.exporterUrl ?? "",
});

export async function start() {
  const { fastify, kafkaConsumer, valkeyService } = await createServer();

  registerShutdown(fastify, { kafkaConsumer, valkeyService });

  logger.info(
    { port: config.port, env: config.env },
    "MS Response starting...",
  );

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });

  logger.info({ port: config.port }, "Server listening");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
