import { initTracing } from "common-monitoring";
import "./logger.js";
import logger from "./logger.js";

initTracing({
  serviceName: "api-gateway",
  exporterUrl: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
});

import { config } from "./config.js";
import { createServer } from "./app.js";

const fastify = await createServer();

logger.info("API Gateway starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
