import { hookInternalToken } from "common-auth";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
export function registerApiHooks(fastify) {
  fastify.addHook(
    "onRequest",
    hookInternalToken({
      publicKeyPath: config.auth.internal.publicKeyPath,
    }),
  );

  fastify.addHook("onResponse", async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime),
      },
      "request completed",
    );
  });
}
