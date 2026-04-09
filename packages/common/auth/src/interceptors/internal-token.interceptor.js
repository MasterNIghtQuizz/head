// @ts-nocheck
import { CryptoService } from "common-crypto";
import { TokenType } from "../enums.js";
import logger from "common-logger";
import { InternalServerError, UnauthorizedError } from "common-errors";

/**
 * @param {import('../types.d.ts').InternalTokenInterceptorOptions} options
 * @returns {import('fastify').onRequestHookHandler}
 */
export function hookInternalTokenInterceptor(options) {
  const { privateKeyPath, source = "api-gateway", expiresIn = "30s" } = options;

  return function internalTokenInterceptor(request, reply, done) {
    if (request.routeOptions?.config?.isPublic) {
      done();
      return;
    }

    const authContext = request.user || request.gameTokenPayload;

    if (!authContext) {
      if (request.routeOptions?.config?.isPublic) {
        return done();
      }
      logger.error({ url: request.url }, "Auth context missing");
      return done(new UnauthorizedError("Unauthorized: Missing auth context"));
    }

    const hasId = !!(authContext.userId || authContext.participantId);
    const hasRole = !!authContext.role;

    if (!hasId || !hasRole) {
      if (request.routeOptions?.config?.isPublic) {
        return done();
      }
      logger.error(
        {
          url: request.url,
          hasId,
          hasRole,
          userId: authContext.userId,
          participantId: authContext.participantId,
          role: authContext.role,
        },
        "Incomplete auth context for internal token generation",
      );
      return done(
        new UnauthorizedError("Unauthorized: Incomplete auth context"),
      );
    }

    try {
      /** @type {import('../types.d.ts').InternalTokenPayload} */
      const payload = {
        userId: request.user?.userId,
        role: request.user?.role,
        sessionId: request.gameTokenPayload?.sessionId,
        participantId: request.gameTokenPayload?.participantId,
        type: TokenType.INTERNAL,
        source,
      };
      logger.info({ payload }, "Generated internal token payload");

      if (request.user && !payload.sessionId && request.user.sessionId) {
        payload.sessionId = request.user.sessionId;
        payload.participantId = request.user.participantId;
      }

      const internalToken = CryptoService.sign(payload, privateKeyPath, {
        expiresIn:
          /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (
            expiresIn
          ),
      });

      request.headers["internal-token"] = internalToken;
      request.internalToken = internalToken;
      done();
    } catch (error) {
      logger.error({ error }, "Failed to generate internal token");
      return done(new InternalServerError("Internal token generation failed"));
    }
  };
}
