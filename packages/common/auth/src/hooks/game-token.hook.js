import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { UnauthorizedError } from "common-errors";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookGameToken(options) {
  return function gameTokenHook(request, _reply, done) {
    if (request.routeOptions?.config?.isPublic) {
      done();
      return;
    }

    const token = /** @type {string | undefined} */ (
      request.headers["game-token"]
    );

    if (!token) {
      if (request.routeOptions?.config?.useGameToken) {
        logger.warn({ url: request.url }, "Missing game-token header");
        return done(new UnauthorizedError("Missing game-token header"));
      }
      done();
      return;
    }

    try {
      const payload = /** @type {import('../types.d.ts').GameTokenPayload} */ (
        CryptoService.verify(token, options.publicKeyPath)
      );

      request.gameTokenPayload = payload;
      request.user = payload;
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid game token");
      return done(new UnauthorizedError("Invalid or expired game token"));
    }
  };
}
