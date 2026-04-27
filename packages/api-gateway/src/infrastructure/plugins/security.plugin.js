import cors from "@fastify/cors";
import { config } from "../../config.js";
import logger from "../../logger.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
export async function securityPlugin(fastify) {
  fastify.addHook("onSend", async (request, reply, payload) => {
    if (!reply.hasHeader("Strict-Transport-Security")) {
      reply.header(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }
    if (!reply.hasHeader("X-DNS-Prefetch-Control")) {
      reply.header("X-DNS-Prefetch-Control", "off");
    }
    if (!reply.hasHeader("X-Frame-Options")) {
      reply.header("X-Frame-Options", "DENY");
    }
    if (!reply.hasHeader("X-XSS-Protection")) {
      reply.header("X-XSS-Protection", "1; mode=block");
    }
    if (!reply.hasHeader("X-Content-Type-Options")) {
      reply.header("X-Content-Type-Options", "nosniff");
    }
    if (!reply.hasHeader("Referrer-Policy")) {
      reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    }
    if (!reply.hasHeader("Content-Security-Policy")) {
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "font-src 'self' https: data:",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "img-src 'self' data: https://api.qrserver.com",
        "object-src 'none'",
        "script-src 'self'",
        "script-src-attr 'none'",
        "style-src 'self' https: 'unsafe-inline'",
        "connect-src 'self' ws: wss: http://localhost:* ws://localhost:* https://*.nightquizz.com wss://*.nightquizz.com https://*.cyrus-ag.com wss://*.cyrus-ag.com",
        "upgrade-insecure-requests",
      ].join("; ");
      reply.header("Content-Security-Policy", csp);
    }
    return payload;
  });

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || config.env === "development") {
        cb(null, true);
        return;
      }
      const allowedOrigins = config.frontendUrl
        ? config.frontendUrl.split(",").map((o) => o.trim())
        : [/^https:\/\/.*\.nightquizz\.com$/i];

      const isAllowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );

      if (isAllowed) {
        cb(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, "CORS Origin rejected");
        cb(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "access-token",
      "refresh-token",
      "internal-token",
      "game-token",
    ],
  });
}
