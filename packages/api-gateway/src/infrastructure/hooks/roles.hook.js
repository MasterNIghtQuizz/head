import { ForbiddenError, UnauthorizedError } from "common-errors";
import logger from "common-logger";

export const hookRoles = () => {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  return async (request, reply) => {
    // @ts-ignore
    const roles = reply.routeOptions?.config?.roles;

    if (!roles || roles.length === 0) {
      return;
    }

    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const userRole = request.user.role;

    if (!roles.includes(userRole)) {
      logger.warn(
        { userId: request.user.userId, userRole, requiredRoles: roles },
        "Role check failed",
      );
      throw new ForbiddenError("Insufficient permissions");
    }
  };
};
