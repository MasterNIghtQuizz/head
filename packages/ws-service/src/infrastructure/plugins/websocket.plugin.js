import fp from "fastify-plugin";
import { WebSocketServer } from "ws";
import { Gauge } from "prom-client";
import { registry } from "common-metrics";
import { errorType, messageType } from "common-websocket";
import logger from "../../logger.js";
import {
  userConnect,
  userDisconnect,
} from "../../handlers/connection.handler.js";
import {
  handleCreateSessionMessage,
  handleDirectChatMessage,
  handleJoinSessionMessage,
  handleStartSessionMessage,
} from "../../handlers/incoming-message.handler.js";

const wsConnectionsActive = new Gauge({
  name: "ws_connections_active",
  help: "Number of active WebSocket connections",
  labelNames: ["service"],
  registers: [registry],
});

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
async function websocketPluginImpl(fastify) {
  const wss = new WebSocketServer({ server: fastify.server });

  wss.on(
    "connection",
    /**
     * @param {import('../../types/ws.d.ts').ExtendedWebSocket} ws
     * @param {import('http').IncomingMessage} req
     */
    (ws, req) => {
      wsConnectionsActive.inc({ service: "ws-service" });
      const connectedUser = userConnect(ws, req);

      logger.info({
        msg: "New WS connection attempt",
        url: req.url,
        success: !!connectedUser,
        user: connectedUser
          ? { id: connectedUser.userId, name: connectedUser.userName }
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
        import("../../handlers/session-membership.handler.js").then(
          ({ userJoinSession }) => {
            userJoinSession(ws, sessionId);
          },
        );
      }

      ws.on("error", (err) => {
        logger.error({ err, userId: connectedUser.userId }, "WebSocket error");
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
                },
              }),
            );
        }
      });

      ws.on("close", (code, _reason) => {
        wsConnectionsActive.dec({ service: "ws-service" });
        userDisconnect(ws, connectedUser.userId, connectedUser.userName);
        logger.info(
          `Client disconnected: ${connectedUser.userId} (code: ${code})`,
        );
      });
    },
  );

  fastify.decorate("wss", wss);
}

/**
 * @param {any} rawMessage
 */
function parseClientMessage(rawMessage) {
  try {
    return JSON.parse(rawMessage.toString());
  } catch {
    return null;
  }
}

export const websocketPlugin = fp(websocketPluginImpl);
