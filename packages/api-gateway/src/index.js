import logger from "common-logger";
import { config } from "./config.js";
import { createServer } from "./app.js";

const fastify = await createServer();

logger.info(config, "API Gateway starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
