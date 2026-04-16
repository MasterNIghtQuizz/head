import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { UnauthorizedError } from "common-errors";
/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookRefreshToken(options) {
  return function refreshTokenHook(request, reply, done) {
    if (
      request.routeOptions?.config?.isPublic ||
      !request.routeOptions?.config?.useRefreshToken ||
      request.url.endsWith("/metrics") ||
      request.url.endsWith("/metric")
    ) {
      done();
      return;
    }

    const token = /** @type {string | undefined} */ (
      request.headers["refresh-token"]
    );

    if (!token) {
      logger.warn({ url: request.url }, "Missing refresh-token header");
      return done(new UnauthorizedError("Missing refresh-token header"));
    }

    try {
      const payload =
        /** @type {import('../types.d.ts').RefreshTokenPayload} */ (
          CryptoService.verify(token, options.publicKeyPath)
        );

      request.user = payload;
      logger.info({ user: request.user }, "Refresh token verified");
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid refresh token");
      return done(new UnauthorizedError("Invalid or expired refresh token"));
    }
  };
}
