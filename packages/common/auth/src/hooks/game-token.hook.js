import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { UnauthorizedError } from "common-errors";
import { URL } from "node:url";

/**
 * @param {import('../types.d.ts').AuthHookOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookGameToken(options) {
  return function gameTokenHook(request, _reply, done) {
    const isWebSocketRequest = request.url?.startsWith("/ws");
    const upgradeHeader = request.headers.upgrade || "";
    const isWebSocketUpgrade = upgradeHeader.toLowerCase() === "websocket";

    if (request.routeOptions?.config?.isPublic) {
      done();
      return;
    }

    let token = isWebSocketRequest
      ? /** @type {string | undefined} */ (request.query?.["game-token"])
      : /** @type {string | undefined} */ (request.headers["game-token"]);

    // If request.query is not yet populated (onRequest hook), parse it manually
    if (isWebSocketRequest && !token) {
      try {
        const url = new URL(request.url, "http://localhost");
        token = url.searchParams.get("game-token") || undefined;
      } catch (e) {
        // Fallback
      }
    }

    if (!token) {
      if (isWebSocketRequest) {
        done();
        return;
      }

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

      logger.debug({ url: request.url, payload }, "Verified game token");
      request.gameTokenPayload = payload;
      if (!request.user) {
        request.user = payload;
      }
      done();
    } catch (error) {
      if (isWebSocketRequest) {
        logger.warn(
          { url: request.url, error },
          "Invalid game token on WS handshake",
        );
        done();
        return;
      }
      logger.warn({ url: request.url, error }, "Invalid game token");
      return done(new UnauthorizedError("Invalid or expired game token"));
    }
  };
}
