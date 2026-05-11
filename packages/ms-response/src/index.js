import { config } from "./config.js";

import { createServer } from "./app.js";
import { registerShutdown } from "./infrastructure/utils/shutdown.util.js";
import logger from "./logger.js";

try {
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
} catch (err) {
  logger.fatal({ err }, "Failed to start MS Response");
  process.exit(1);
}
