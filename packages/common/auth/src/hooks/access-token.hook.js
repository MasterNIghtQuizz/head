import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { UnauthorizedError } from "common-errors";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookAccessToken(options) {
  return function accessTokenHook(request, reply, done) {
    const isWebSocketRequest =
      request.url?.startsWith("/ws") && request.headers.upgrade === "websocket";
    if (
      request.routeOptions?.config?.isPublic ||
      request.url.endsWith("/metrics") ||
      request.url.endsWith("/metric")
    ) {
      done();
      return;
    }
    if (request.routeOptions?.config?.useRefreshToken) {
      done();
      return;
    }
    let token;
    if (isWebSocketRequest) {
      // For webscoket connections, access token inside query parameters
      token = /** @type {string | undefined} */ (request.query["access-token"]);
    } else {
      token = /** @type {string | undefined} */ (
        request.headers["access-token"]
      );
    }
    if (request.routeOptions?.config?.useGameToken) {
      done();
      return;
    }

    if (!token) {
      logger.warn({ url: request.url }, "Missing access-token header");
      return done(new UnauthorizedError("Missing access-token header"));
    }

    try {
      const payload =
        /** @type {import('../types.d.ts').AccessTokenPayload} */ (
          CryptoService.verify(token, options.publicKeyPath)
        );

      request.user = payload;
      done();
    } catch (error) {
      logger.warn({ url: request.url, error }, "Invalid access token");
      return done(new UnauthorizedError("Invalid or expired access token"));
    }
  };
}
