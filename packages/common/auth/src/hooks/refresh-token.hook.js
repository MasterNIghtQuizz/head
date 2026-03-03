import { CryptoService } from "common-crypto";
import logger from "common-logger";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookRefreshToken(options) {
  return function refreshTokenHook(request, reply, done) {
    if (request.routeOptions?.config?.isPublic) {
      done();
      return;
    }

    const token = /** @type {string | undefined} */ (
      request.headers["refresh-token"]
    );

    if (!token) {
      logger.warn({ url: request.url }, "Missing refresh-token header");
      reply.code(401).send({ error: "Missing refresh-token header" });
      return;
    }

    try {
      const payload =
        /** @type {import('../types.d.ts').RefreshTokenPayload} */ (
          CryptoService.verify(token, options.publicKeyPath)
        );

      request.refreshTokenPayload = payload;
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid refresh token");
      reply.code(401).send({ error: "Invalid or expired refresh token" });
    }
  };
}
