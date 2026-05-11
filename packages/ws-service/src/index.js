import { config } from "./config.js";

import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { createServer } from "./app.js";
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";
import { serviceUp } from "common-metrics";

export async function start() {
  const { fastify, wss, kafkaConsumer, valkeyConsumer } = await createServer();

  registerShutdown(fastify, { wss, kafkaConsumer, valkeyConsumer });

  logger.info({ port: config.port, env: config.env }, "WS Service starting...");

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });

  serviceUp.set({ service: "ws-service" }, 1);
  logger.info({ port: config.port }, "Server listening");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
