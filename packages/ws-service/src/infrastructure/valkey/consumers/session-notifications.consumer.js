import { ValkeyService } from "common-valkey";
import { messageType } from "common-websocket";
import { broadcastToSession } from "../../../lib/messaging.js";
import logger from "../../../logger.js";

export class SessionNotificationsConsumer {
  /** @type {ValkeyService} */
  #valkeyService;

  /** @type {import('ioredis').Redis | null} */
  #subscriber = null;

  /** @type {boolean} */
  #stopped = false;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #retryTimer = null;

  /**
   * @param {import('common-valkey').ValkeyConfig} config
   */
  constructor(config) {
    this.#valkeyService = new ValkeyService(config);
  }

  async start() {
    this.#stopped = false;
    await this.#connect();
  }

  async #connect(attempt = 0) {
    if (this.#stopped) {
      return;
    }

    try {
      this.#subscriber = await this.#valkeyService.connect();

      const channel = "ws:session:results";
      await this.#subscriber.subscribe(channel);

      logger.info(
        { channel, attempt },
        "Valkey SessionNotificationsConsumer started and subscribed",
      );

      this.#subscriber.on("message", (chan, message) => {
        if (chan === channel) {
          this.handleMessage(message);
        }
      });

      this.#subscriber.on("error", (err) => {
        logger.error({ err }, "Valkey subscriber error, scheduling reconnect");
      });

      this.#subscriber.on("close", () => {
        if (!this.#stopped) {
          logger.warn(
            "Valkey subscriber connection closed, scheduling reconnect",
          );
          this.#scheduleReconnect(0);
        }
      });
    } catch (error) {
      logger.error(
        { error, attempt },
        "Failed to connect Valkey SessionNotificationsConsumer",
      );
      this.#scheduleReconnect(attempt);
    }
  }

  /**
   * @param {number} attempt
   */
  #scheduleReconnect(attempt) {
    if (this.#stopped) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    logger.info({ delay, attempt: attempt + 1 }, "Scheduling Valkey reconnect");
    this.#retryTimer = setTimeout(() => {
      this.#connect(attempt + 1);
    }, delay);
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
    this.#stopped = true;
    if (this.#retryTimer) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
    if (this.#subscriber) {
      try {
        await this.#valkeyService.disconnect();
      } catch (err) {
        logger.warn({ err }, "Error during Valkey subscriber disconnect");
      }
      this.#subscriber = null;
    }
  }
}
