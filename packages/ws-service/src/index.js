import { WebSocketServer } from "ws";
import { errorType, messageType } from "common-websocket";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { config } from "./config.js";

import { userConnect, userDisconnect } from "./handlers/connection.handler.js";
import {
  handleCreateSessionMessage,
  handleDirectChatMessage,
  handleJoinSessionMessage,
  handleStartSessionMessage,
  parseClientMessage,
} from "./handlers/incoming-message.handler.js";
import { SessionEventsConsumer } from "./infrastructure/kafka/consumers/session-events.consumer.js";

const { default: logger } = await import("./logger.js");

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

const wss = new WebSocketServer({ port: config.port });

wss.on(
  "connection",
  (
    ws,
    req,
  ) /** @param {import("ws").WebSocket} ws  @param {import("http").IncomingMessage} req */ => {
    const connectedUser = userConnect(ws, req);
    if (!connectedUser) {
      return;
    }

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

    ws.on(
      "close",
      (code, reason) /** @param {number} code @param {Buffer} reason */ => {
        userDisconnect(ws, connectedUser.userId, connectedUser.userName);
        logger.info(
          `Client disconnected with code ${code} and reason: ${reason.toString()}`,
        );
      },
    );
  },
);

logger.info(`WebSocket service started on port ${config.port}`);

let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info("Gracefully shutting down ws-service...");

  if (kafkaConsumer) {
    await kafkaConsumer.stop().catch((error) => {
      logger.error({ error }, "Failed to stop Kafka consumer cleanly");
    });
  }

  await new Promise((resolve) => {
    wss.close(() => resolve(null));
  });

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
