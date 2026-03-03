import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";

const fastify = Fastify({ logger });

fastify.get("/health", async () => {
  return { status: "ok", service: "ms-quizz-management" };
});

logger.info(config, "MS Quizz Management starting...");
await fastify.listen({ host: "0.0.0.0", port: config.port });
