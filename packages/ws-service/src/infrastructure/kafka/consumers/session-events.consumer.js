import { SessionEventTypes, Topics } from "common-contracts";
import { messageType } from "common-websocket";
import {
  getSessionSockets,
  getSocketContext,
} from "../../../lib/connection-store.js";
import { broadcastToSession } from "../../../lib/messaging.js";
import {
  deleteSessionCapacity,
  setSessionCapacity,
} from "../../../lib/session-capacity-store.js";
import logger from "../../../logger.js";

/**
 * @typedef {import("common-contracts").SessionCreatedEventPayload | import("common-contracts").SessionStartedEventPayload | import("common-contracts").SessionNextQuestionEventPayload | import("common-contracts").SessionEndedEventPayload | import("common-contracts").SessionDeletedEventPayload | import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload | import("common-contracts").QuizResponseSubmittedEventPayload} SessionKafkaPayload
 */

export class SessionEventsConsumer {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   */
  constructor(kafkaConsumer) {
    this.kafkaConsumer = kafkaConsumer;
  }

  register() {
    logger.info(
      { topic: Topics.QUIZZ_EVENTS },
      "Registering SessionEventsConsumer for topic",
    );
    this.kafkaConsumer.addHandler(Topics.QUIZZ_EVENTS, async (message) => {
      await this.handleEvent(message);
    });
  }

  /**
   * @param {import('common-contracts').KafkaEvent} message
   * @returns {Promise<void>}
   */
  async handleEvent(message) {
    const { eventType, payload, eventId } = message;
    const logCtx = { eventId, eventType };

    logger.debug(logCtx, "DEBUG [ws-service] Received event from Kafka");

    switch (eventType) {
      case SessionEventTypes.SESSION_CREATED:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling SESSION_CREATED event",
        );
        await this.onSessionCreated(payload);
        break;

      case SessionEventTypes.SESSION_NEXT_QUESTION:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling SESSION_NEXT_QUESTION event",
        );
        // Intentionally left empty for now.
        break;

      case SessionEventTypes.SESSION_ENDED:
        logger.info(logCtx, "DEBUG [ws-service] Handling SESSION_ENDED event");
        await this.destroySessionAndKickParticipants(payload, "ended");
        break;

      case SessionEventTypes.SESSION_DELETED:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling SESSION_DELETED event",
        );
        await this.destroySessionAndKickParticipants(payload, "deleted");
        break;

      case SessionEventTypes.PARTICIPANT_JOINED:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling PARTICIPANT_JOINED event",
        );
        this.notifyParticipants(payload, messageType.USER_ONLINE);
        break;

      case SessionEventTypes.PARTICIPANT_LEFT:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling PARTICIPANT_LEFT event",
        );
        this.notifyParticipants(payload, messageType.USER_OFFLINE);
        break;

      case SessionEventTypes.QUIZ_RESPONSE_SUBMITTED:
        // Intentionally left empty for now.
        break;

      default:
        logger.warn(logCtx, "DEBUG [ws-service] Unknown event type received");
    }
  }

  /**
   * @param {import("common-contracts").SessionCreatedEventPayload} payload
   * @returns {Promise<void>}
   */
  async onSessionCreated(payload) {
    const sessionId = payload?.session_id;
    const participantId = payload?.participant_id;
    const nickname = payload?.nickname;

    if (!sessionId || !participantId || !nickname) {
      logger.warn(
        { payload },
        "DEBUG [ws-service] Missing required fields in session-created event payload",
      );
      return;
    }

    setSessionCapacity(sessionId, 10, false, participantId);
    logger.info(
      { sessionId, ownerId: participantId, nickname },
      "DEBUG [ws-service] Session state initialized successfully from SESSION_CREATED event",
    );
  }

  /**
   * @param {import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload} payload
   * @param {typeof messageType.USER_ONLINE | typeof messageType.USER_OFFLINE} eventType
   * @returns {void}
   */
  notifyParticipants(payload, eventType) {
    const sessionId = payload?.session_id;
    const participantId = payload?.participant_id;
    const nickname = payload?.nickname;

    logger.info(
      { sessionId, participantId, nickname, eventType },
      "DEBUG [ws-service] Processing participant event for broadcast",
    );

    if (!sessionId || !participantId || !nickname) {
      logger.warn(
        { payload },
        "DEBUG [ws-service] Missing required fields in participant event payload",
      );
      return;
    }

    logger.info(
      { sessionId, participantId, nickname },
      "DEBUG [ws-service] Broadcasting participant event to session sockets",
    );
    broadcastToSession(
      sessionId,
      {
        type: eventType,
        payload: {
          userId: participantId,
          userName: nickname,
          role: payload.role,
        },
      },
      null,
    );
  }

  /**
   * @param {import("common-contracts").SessionEndedEventPayload | import("common-contracts").SessionDeletedEventPayload} payload
   * @param {"ended" | "deleted"} reason
   * @returns {Promise<void>}
   */
  async destroySessionAndKickParticipants(payload, reason) {
    const sessionId = payload?.session_id;
    if (!sessionId) {
      logger.warn({ payload }, "Missing session id in lifecycle event payload");
      return;
    }

    const sockets = Array.from(getSessionSockets(sessionId));

    broadcastToSession(
      sessionId,
      {
        type:
          reason === "ended"
            ? messageType.SESSION_ENDED
            : messageType.SESSION_DELETED,
        payload: { sessionId },
      },
      null,
    );

    for (const socket of sockets) {
      const socketContext = getSocketContext(socket);
      try {
        socket.close(4001, `session_${reason}`);
      } catch (error) {
        logger.warn(
          { error, sessionId, userId: socketContext?.userId ?? null },
          "Failed to close socket during session cleanup",
        );
      }
    }

    deleteSessionCapacity(sessionId);
    logger.info(
      { sessionId, reason },
      "Session destroyed and participants kicked",
    );
  }
}
