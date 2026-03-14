import { vi } from "vitest";

/**
 * @typedef {Object} ExecutionContext
 * @property {import('fastify').FastifyRequest} request
 * @property {import('fastify').FastifyReply} reply
 * @property {import('vitest').Mock} done
 * @property {import('fastify').FastifyInstance} fastify
 */

/**
 * @param {Record<string, string>} headers
 * @param {import('../types.d.ts').AccessTokenPayload | undefined} [user]
 * @returns {ExecutionContext}
 */
export function createExecutionContext(headers = {}, user = undefined) {
  const request = /** @type {import('fastify').FastifyRequest} */ (
    /** @type {unknown} */ ({
      headers,
      url: "/test-route",
      routeOptions: {
        config: {
          isPublic: false,
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

  const fastify = /** @type {import('fastify').FastifyInstance} */ (
    /** @type {unknown} */ ({})
  );

  return { request, reply, done, fastify };
}
