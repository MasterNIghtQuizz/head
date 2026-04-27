import { vi } from "vitest";

/**
 * @typedef {Object} ExecutionContext
 * @property {import('fastify').FastifyRequest} request
 * @property {import('fastify').FastifyReply} reply
 * @property {import('vitest').Mock} done
 * @property {import('fastify').FastifyInstance<any, any, any, any, any>} fastify
 */

/**
 * @param {Record<string, string>} headers
 * @param {import('../types.d.ts').AccessTokenPayload | undefined} [user]
 * @param {boolean} [isPublic]
 * @returns {ExecutionContext}
 */
export function createExecutionContext(
  headers = {},
  user = undefined,
  isPublic = false,
) {
  const request = /** @type {import('fastify').FastifyRequest} */ (
    /** @type {unknown} */ ({
      headers,
      url: "/test-route",
      routeOptions: {
        config: {
          isPublic,
        },
      },
      user,
    })
  );

  const reply = /** @type {import('fastify').FastifyReply} */ (
    /** @type {unknown} */ ({
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    })
  );

  const done = vi.fn();

  const fastify = /** @type {import('fastify').FastifyInstance<any, any, any, any, any>} */ (
    /** @type {unknown} */ ({})
  );

  return { request, reply, done, fastify };
}
