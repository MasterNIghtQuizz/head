import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";

const fastify = Fastify({ loggerInstance: logger });

fastify.addHook(
  "onRequest",
  hookInternalToken({
    publicKeyPath: config.auth.internal.publicKeyPath,
  }),
);

fastify.get("/health", { config: { isPublic: true } }, async () => {
  return { status: "ok", service: "ms-quizz-management" };
});

await registerSwagger(fastify, {
  title: "MS Quizz Management",
  description: "Quizz Management Service API",
  version: "1.0.0",
});

await initDatabase();
logger.info(config, "MS Quizz Management starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
