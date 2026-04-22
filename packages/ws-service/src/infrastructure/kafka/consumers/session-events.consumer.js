import { SessionEventTypes } from "common-contracts";
import { messageType } from "common-websocket";
import { getSessionSockets, getSocketContext } from "../../../lib/connection-store.js";
import { broadcastToSession } from "../../../lib/messaging.js";
import { deleteSessionCapacity } from "../../../lib/session-capacity-store.js";
import logger from "../../../logger.js";

const sessionLifecycleMessageType = {
  SESSION_ENDED: "session_ended",
  SESSION_DELETED: "session_deleted",
};

/**
 * @typedef {import("common-contracts").SessionCreatedEventPayload | import("common-contracts").SessionStartedEventPayload | import("common-contracts").SessionNextQuestionEventPayload | import("common-contracts").SessionEndedEventPayload | import("common-contracts").SessionDeletedEventPayload | import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload | import("common-contracts").QuizResponseSubmittedEventPayload} SessionKafkaPayload
 */

/**
 * @param {SessionKafkaPayload} payload
 * @returns {string | null}
 */
function resolveSessionId(payload) {
  return payload?.session_id ?? payload?.sessionId ?? null;
}

/**
 * @param {import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload} payload
 * @returns {string | null}
 */
function resolveParticipantId(payload) {
  return payload?.participant_id ?? payload?.participantId ?? null;
}

export class SessionEventsConsumer {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   */
  constructor(kafkaConsumer) {
    this.kafkaConsumer = kafkaConsumer;
  }

  register() {
    this.kafkaConsumer.addHandler(
      SessionEventTypes.SESSION_CREATED,
      /** @param {import("common-contracts").SessionCreatedEventPayload} payload */
      async (payload) => {
        const sessionId = resolveSessionId(payload);
        logger.info(
          { sessionId, payload },
          "Kafka session-created event received",
        );
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.SESSION_NEXT_QUESTION,
      /** @param {import("common-contracts").SessionNextQuestionEventPayload} _payload */
      async (_payload) => {
        // Intentionally left empty for now.
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.SESSION_ENDED,
      /** @param {import("common-contracts").SessionEndedEventPayload} payload */
      async (payload) => {
        await this.destroySessionAndKickParticipants(payload, "ended");
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.SESSION_DELETED,
      /** @param {import("common-contracts").SessionDeletedEventPayload} payload */
      async (payload) => {
        await this.destroySessionAndKickParticipants(payload, "deleted");
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.PARTICIPANT_JOINED,
      /** @param {import("common-contracts").ParticipantJoinedEventPayload} payload */
      async (payload) => {
        this.notifyParticipants(payload, messageType.USER_ONLINE);
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.PARTICIPANT_LEFT,
      /** @param {import("common-contracts").ParticipantLeftEventPayload} payload */
      async (payload) => {
        this.notifyParticipants(payload, messageType.USER_OFFLINE);
      },
    );

    this.kafkaConsumer.addHandler(
      SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
      /** @param {import("common-contracts").QuizResponseSubmittedEventPayload} _payload */
      async (_payload) => {
        // Intentionally left empty for now.
      },
    );
  }

  /**
   * @param {import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload} payload
   * @param {typeof messageType.USER_ONLINE | typeof messageType.USER_OFFLINE} eventType
   * @returns {void}
   */
  notifyParticipants(payload, eventType) {
    const sessionId = resolveSessionId(payload);
    if (!sessionId) {
      logger.warn({ payload }, "Missing session id in participant event payload");
      return;
    }

    broadcastToSession(
      sessionId,
      {
        type: eventType,
        payload: {
          participantId: resolveParticipantId(payload),
          role: payload?.role ?? null,
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
    const sessionId = resolveSessionId(payload);
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
            ? sessionLifecycleMessageType.SESSION_ENDED
            : sessionLifecycleMessageType.SESSION_DELETED,
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
    logger.info({ sessionId, reason }, "Session destroyed and participants kicked");
  }
}
