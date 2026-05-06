import { initTracing } from "common-monitoring";
import { config } from "./config.js";

initTracing({
  serviceName: "ws-service",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import { WebSocketServer } from "ws";
import { Gauge } from "prom-client";
import { registry, createMetricsPlugin, serviceUp } from "common-metrics";
import { errorType, messageType } from "common-websocket";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import Fastify from "fastify";

import { userConnect, userDisconnect } from "./handlers/connection.handler.js";
import {
  handleCreateSessionMessage,
  handleDirectChatMessage,
  handleJoinSessionMessage,
  handleStartSessionMessage,
  parseClientMessage,
} from "./handlers/incoming-message.handler.js";
import { SessionEventsConsumer } from "./infrastructure/kafka/consumers/session-events.consumer.js";
import { SessionNotificationsConsumer } from "./infrastructure/valkey/consumers/session-notifications.consumer.js";

const { default: logger } = await import("./logger.js");

const fastify = Fastify({
  loggerInstance: logger,
  disableRequestLogging: false,
});

logger.info(
  { metricsEnabled: config.metrics.enabled, port: config.port },
  "Service configuration diagnostic",
);

await fastify.register(
  createMetricsPlugin({
    serviceName: "ws-service",
    enabled: config.metrics.enabled,
  }),
);

fastify.get("/health", async () => {
  return { status: "ok", service: "ws-service" };
});

await fastify.ready();
serviceUp.set({ service: "ws-service" }, 1);

const wsConnectionsActive = new Gauge({
  name: "ws_connections_active",
  help: "Number of active WebSocket connections",
  labelNames: ["service"],
  registers: [registry],
});

/** @type {KafkaConsumer | null} */
let kafkaConsumer = null;
if (config.kafka.enabled) {
  const kafkaClient = createKafkaClient({
    clientId: "ws-service",
    brokers: config.kafka.brokers,
  });

  kafkaConsumer = new KafkaConsumer(kafkaClient, {
    groupId: "ws-service-group",
  });
  new SessionEventsConsumer(kafkaConsumer).register();

  try {
    await kafkaConsumer.start();
  } catch (error) {
    logger.error(
      { error },
      "Kafka connection failed. Service will continue without event consumption.",
    );
  }
}

/** @type {SessionNotificationsConsumer | null} */
let valkeyConsumer = null;
if (config.valkey && config.valkey.enabled) {
  valkeyConsumer = new SessionNotificationsConsumer(config.valkey);
  valkeyConsumer.start();
}

const wss = new WebSocketServer({ server: fastify.server });

wss.on(
  "connection",
  (
    ws,
    req,
  ) /** @param {import("ws").WebSocket} ws  @param {import("http").IncomingMessage} req */ => {
    wsConnectionsActive.inc({ service: "ws-service" });
    const connectedUser = userConnect(ws, req);

    logger.info({
      msg: "New WS connection attempt",
      url: req.url,
      headers: req.headers,
      success: !!connectedUser,
      user: connectedUser
        ? {
            id: connectedUser.userId,
            name: connectedUser.userName,
            role: connectedUser.role,
          }
        : "unauthorized",
    });

    if (!connectedUser) {
      wsConnectionsActive.dec({ service: "ws-service" });
      ws.close(1008, "Authentication failed");
      return;
    }

    // Auto-join session if present in token/URL
    const sessionId = connectedUser.sessionId;
    if (sessionId) {
      import("./handlers/session-membership.handler.js").then(
        ({ userJoinSession }) => {
          userJoinSession(ws, sessionId);
        },
      );
    }

    ws.on("error", (err) => {
      logger.error(
        { err, userId: connectedUser.userId },
        "WebSocket error occurred for user",
      );
    });

    ws.on("message", (rawMessage) => {
      const parsedMessage = parseClientMessage(rawMessage);
      if (!parsedMessage) {
        ws.send(
          JSON.stringify({
            type: messageType.ERROR,
            payload: { reason: errorType.INVALID_JSON },
          }),
        );
        return;
      }

      const parsedType = parsedMessage.type;
      switch (parsedType) {
        case messageType.CREATE_SESSION:
          handleCreateSessionMessage(ws, parsedMessage.payload);
          break;
        case messageType.START_SESSION:
          handleStartSessionMessage(ws, parsedMessage.payload);
          break;
        case messageType.JOIN_SESSION:
          handleJoinSessionMessage(ws, parsedMessage.payload);
          break;
        case messageType.CHAT_MESSAGE:
          handleDirectChatMessage(
            ws,
            connectedUser.userId,
            parsedMessage.payload,
          );
          break;
        default:
          ws.send(
            JSON.stringify({
              type: messageType.ERROR,
              payload: {
                reason: errorType.UNSUPPORTED_MESSAGE_TYPE,
                value: parsedType,
                service: "ws-service",
              },
            }),
          );
      }
    });

    ws.on(
      "close",
      (code, reason) /** @param {number} code @param {Buffer} reason */ => {
        wsConnectionsActive.dec({ service: "ws-service" });
        userDisconnect(ws, connectedUser.userId, connectedUser.userName);
        logger.info(
          `Client ${connectedUser.userName} ${connectedUser.userId} disconnected with code ${code} and reason: ${reason.toString()}`,
        );
      },
    );
  },
);

try {
  await fastify.listen({ port: config.port, host: "0.0.0.0" });
  logger.info(`WebSocket service started on port ${config.port}`);
} catch (err) {
  logger.error(err, "Failed to start Fastify server");
  throw new Error("Startup failed", { cause: err });
}

let shuttingDown = false;
const shutdown = async (/** @type {string} */ signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "Starting graceful shutdown...");

  try {
    await new Promise((resolve, reject) => {
      wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      });
    });
    logger.info("WebSocket server closed");
  } catch (err) {
    logger.error({ err }, "Error closing WebSocket server");
  }

  try {
    await fastify.close();
    logger.info("HTTP server closed");
  } catch (err) {
    logger.error({ err }, "Error closing HTTP server");
  }

  if (kafkaConsumer) {
    try {
      await kafkaConsumer.stop();
      logger.info("Kafka consumer stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping Kafka consumer");
    }
  }

  if (valkeyConsumer) {
    try {
      await valkeyConsumer.stop();
      logger.info("Valkey consumer stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping Valkey consumer");
    }
  }

  logger.info("Shutdown complete. Exiting.");
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
