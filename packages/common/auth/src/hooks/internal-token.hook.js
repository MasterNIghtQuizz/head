import { CryptoService } from "common-crypto";
import logger from "common-logger";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookInternalToken(options) {
  return function internalTokenHook(request, reply, done) {
    if (request.routeOptions?.config?.isPublic) {
      done();
      return;
    }

    const token = /** @type {string | undefined} */ (
      request.headers["internal-token"]
    );

    if (!token) {
      logger.warn({ url: request.url }, "Missing internal-token header");
      reply.code(401).send({ error: "Missing internal-token header" });
      return;
    }

    try {
      const payload =
        /** @type {import('../types.d.ts').InternalTokenPayload} */ (
          CryptoService.verify(token, options.publicKeyPath)
        );

      request.internalTokenPayload = payload;
      request.user = {
        userId: payload.userId,
        role: payload.role,
        type: payload.type,
      };
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid internal token");
      reply.code(401).send({ error: "Invalid or expired internal token" });
    }
  };
}
