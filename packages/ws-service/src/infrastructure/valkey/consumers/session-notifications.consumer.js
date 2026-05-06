import { ValkeyService } from "common-valkey";
import { messageType } from "common-websocket";
import { broadcastToSession } from "../../../lib/messaging.js";
import logger from "../../../logger.js";

export class SessionNotificationsConsumer {
  /** @type {ValkeyService} */
  #valkeyService;

  /** @type {import('ioredis').Redis | null} */
  #subscriber = null;

  /**
   * @param {import('common-valkey').ValkeyConfig} config
   */
  constructor(config) {
    this.#valkeyService = new ValkeyService(config);
  }

  async start() {
    try {
      this.#subscriber = await this.#valkeyService.connect();

      const channel = "ws:session:results";
      await this.#subscriber.subscribe(channel);

      logger.info(
        { channel },
        "Valkey SessionNotificationsConsumer started and subscribed",
      );

      this.#subscriber.on("message", (chan, message) => {
        if (chan === channel) {
          this.handleMessage(message);
        }
      });
    } catch (error) {
      logger.error(
        { error },
        "Failed to start Valkey SessionNotificationsConsumer",
      );
    }
  }

  /**
   * @param {string} rawMessage
   */
  handleMessage(rawMessage) {
    try {
      const { eventType, payload } = JSON.parse(rawMessage);

      logger.info(
        { eventType, sessionId: payload?.sessionId },
        "Valkey notification received",
      );

      if (eventType === "SESSION_RESULTS_DISPLAYED") {
        const { sessionId, questionId } = payload;

        /** @type {import('common-websocket').ServerToClientMessage} */
        const wsMessage = {
          type: messageType.SESSION_RESULTS_DISPLAYED,
          payload: { sessionId, questionId },
        };
        broadcastToSession(sessionId, wsMessage, null);
      }
    } catch (error) {
      logger.error({ error, rawMessage }, "Failed to handle Valkey message");
    }
  }

  async stop() {
    if (this.#subscriber) {
      await this.#valkeyService.disconnect();
      this.#subscriber = null;
    }
  }
}
