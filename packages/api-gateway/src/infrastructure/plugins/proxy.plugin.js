import proxy from "@fastify/http-proxy";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
export async function proxyPlugin(fastify) {
  await fastify.register(proxy, {
    upstream: config.services.websocket,
    prefix: "/ws",
    websocket: true,
  });
}
