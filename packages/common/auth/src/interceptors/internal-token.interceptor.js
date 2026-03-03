import { CryptoService } from "common-crypto";
import { TokenType } from "../enums.js";
import logger from "common-logger";

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

    if (!request.user || !request.user.userId || !request.user.role) {
      logger.error(
        { url: request.url },
        "Cannot generate internal token: missing or incomplete request.user (route is not public)",
      );
      reply.code(401).send({ error: "Unauthorized: Missing user context" });
      return;
    }

    try {
      /** @type {import('../types.d.ts').InternalTokenPayload} */
      const payload = {
        userId: request.user.userId,
        role: request.user.role,
        type: TokenType.INTERNAL,
        source,
      };

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
      reply.code(500).send({ error: "Internal token generation failed" });
    }
  };
}
