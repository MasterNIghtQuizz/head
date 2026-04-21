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
 * @param {any} payload
 * @returns {string | null}
 */
function resolveSessionId(payload) {
  return payload?.session_id ?? payload?.sessionId ?? null;
}

/**
 * @param {any} payload
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
      async (_payload) => {
        // Intentionally left empty for now.
      },
    );

    this.kafkaConsumer.addHandler(SessionEventTypes.SESSION_ENDED, async (payload) => {
      await this.destroySessionAndKickParticipants(payload, "ended");
    });

    this.kafkaConsumer.addHandler(SessionEventTypes.SESSION_DELETED, async (payload) => {
      await this.destroySessionAndKickParticipants(payload, "deleted");
    });

    this.kafkaConsumer.addHandler(SessionEventTypes.PARTICIPANT_JOINED, async (payload) => {
      this.notifyParticipants(payload, messageType.USER_ONLINE);
    });

    this.kafkaConsumer.addHandler(SessionEventTypes.PARTICIPANT_LEFT, async (payload) => {
      this.notifyParticipants(payload, messageType.USER_OFFLINE);
    });

    this.kafkaConsumer.addHandler(
      SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
      async (_payload) => {
        // Intentionally left empty for now.
      },
    );
  }

  /**
   * @param {any} payload
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
   * @param {any} payload
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
