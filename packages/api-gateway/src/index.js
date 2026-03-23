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

logger.info("API Gateway starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
