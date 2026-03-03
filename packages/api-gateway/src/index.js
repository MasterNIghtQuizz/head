import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { registerSwagger } from "common-swagger";
import { ControllerFactory } from "common-core";
import { hookAccessToken, hookInternalTokenInterceptor } from "common-auth";
import { HelpersController } from "./modules/helpers/controllers/helpers.controller.js";
import { HelpersService } from "./modules/helpers/services/helpers.service.js";

const fastify = Fastify({ loggerInstance: logger });

fastify.addHook(
  "onRequest",
  hookAccessToken({ publicKeyPath: config.auth.access.publicKeyPath }),
);

fastify.addHook(
  "onRequest",
  hookInternalTokenInterceptor({
    privateKeyPath: config.auth.internal.privateKeyPath,
    source: "api-gateway",
    expiresIn: "30s",
  }),
);

fastify.get("/health", { config: { isPublic: true } }, async () => {
  return { status: "ok", service: "api-gateway" };
});

// @ts-ignore
await registerSwagger(fastify, {
  title: "API Gateway",
  description: "Quiz Master Gateway API",
  version: "1.0.0",
});

import { UserController } from "./modules/user/controllers/user.controller.js";
import { UserService } from "./modules/user/services/user.service.js";

const helpersService = new HelpersService();
ControllerFactory.register(fastify, HelpersController, [helpersService]);

const userService = new UserService();
ControllerFactory.register(fastify, UserController, [userService]);

logger.info(config, "API Gateway starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });
