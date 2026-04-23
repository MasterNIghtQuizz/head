import { CryptoService } from "common-crypto";
import { UnauthorizedError } from "common-errors";
import logger from "common-logger";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookInternalToken(options) {
  return function internalTokenHook(request, _reply, done) {
    if (
      request.routeOptions?.config?.isPublic ||
      request.url.endsWith("/metrics") ||
      request.url.endsWith("/metric") ||
      request.url.endsWith("/health")
    ) {
      done();
      return;
    }

    const token = /** @type {string | undefined} */ (
      request.headers["internal-token"]
    );

    if (!token) {
      logger.warn({ url: request.url }, "Missing internal-token header");
      return done(new UnauthorizedError("Missing internal-token header"));
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
        sessionId: payload.sessionId,
        participantId: payload.participantId,
        type: payload.type,
      };
      logger.info({ user: request.user }, "Internal token verified");
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid internal token");
      return done(new UnauthorizedError("Invalid or expired internal token"));
    }
  };
}
