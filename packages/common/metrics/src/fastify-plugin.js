import fp from "fastify-plugin";
import { registry } from "./registry.js";
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpActiveRequests,
  serviceUp,
  serviceStartTimestamp,
} from "./http-metrics.js";

/** Paths excluded from HTTP metrics instrumentation */
const EXCLUDED_PATHS = new Set(["/metrics", "/health", "/documentation"]);

/**
 * Creates a non-encapsulated Fastify plugin (via fastify-plugin) that:
 *  - Exposes GET /metrics in Prometheus text format
 *  - Records http_request_duration_seconds, http_requests_total, http_active_requests
 *    for every route registered on the instance (hooks propagate to the root scope)
 *  - Sets service_up = 1 on startup, 0 on graceful close
 *
 * Must be registered BEFORE any routes so the onRequest/onResponse hooks
 * are in place when those routes handle their first requests.
 *
 * @param {{ serviceName: string; enabled?: boolean }} options
 * @returns {import('fastify').FastifyPluginAsync}
 */
export function createMetricsPlugin({ serviceName, enabled = true }) {
  /**
   * @param {import('fastify').FastifyInstance<any, any, any, any, any>} fastify
   * @returns {Promise<void>}
   */
  async function plugin(fastify) {
    if (!enabled) {
      return;
    }

    serviceUp.set({ service: serviceName }, 1);
    serviceStartTimestamp.set({ service: serviceName }, Date.now() / 1000);

    // Increment in-flight counter on every incoming request
    fastify.addHook("onRequest", async (request) => {
      const path = request.url.split("?")[0];
      if (EXCLUDED_PATHS.has(path)) {
        return;
      }
      httpActiveRequests.inc({ service: serviceName });
    });

    // Record duration + total on completion, then decrement in-flight
    fastify.addHook("onResponse", async (request, reply) => {
      const path = request.url.split("?")[0];
      if (EXCLUDED_PATHS.has(path)) {
        return;
      }

      // Use the parameterised route pattern (e.g. /users/:id) to avoid
      // label cardinality explosion from path parameters
      const routeOptions = /** @type {{ url?: string } | undefined} */ (
        request.routeOptions
      );
      const route = routeOptions?.url ?? path;

      const labels = {
        method: request.method,
        route,
        status_code: String(reply.statusCode),
        service: serviceName,
      };

      httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
      httpRequestsTotal.inc(labels);
      httpActiveRequests.dec({ service: serviceName });
    });

    fastify.addHook("onClose", async () => {
      serviceUp.set({ service: serviceName }, 0);
    });

    fastify.get(
      "/metrics",
      { config: { isPublic: true } },
      async (_req, reply) => {
        reply.header("Content-Type", registry.contentType);
        return reply.send(await registry.metrics());
      },
    );

    fastify.get(
      "/metric",
      { config: { isPublic: true } },
      async (_req, reply) => {
        reply.header("Content-Type", registry.contentType);
        return reply.send(await registry.metrics());
      },
    );
  }

  return fp(plugin, {
    name: "common-metrics",
    fastify: "5.x",
  });
}
