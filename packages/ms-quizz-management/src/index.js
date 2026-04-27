import { initTracing } from "common-monitoring";
import { config } from "./config.js";

initTracing({
  serviceName: "ms-quizz-management",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import "reflect-metadata";
import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { createServer } from "./app.js";
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fastify, kafkaConsumer, valkeyService } = await createServer();

  registerShutdown(fastify, { kafkaConsumer, valkeyService });

  logger.info(
    { port: config.port, env: config.env },
    "MS Quizz Management starting...",
  );
  await fastify.listen({ host: "0.0.0.0", port: config.port });
}
