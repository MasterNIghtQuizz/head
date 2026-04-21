import { initTracing } from "common-monitoring";
import { config } from "./config.js";

initTracing({
  serviceName: "api-gateway",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

const { default: logger } = await import("./logger.js");
const { createServer } = await import("./app.js");

const fastify = await createServer();

logger.info({ port: config.port, env: config.env }, "API Gateway starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });

let shuttingDown = false;
const shutdown = async (/** @type {string} */ signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "Starting graceful shutdown...");

  try {
    await fastify.close();
    logger.info("HTTP server closed");
  } catch (err) {
    logger.error({ err }, "Error closing HTTP server");
  }

  logger.info("Shutdown complete. Exiting.");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
