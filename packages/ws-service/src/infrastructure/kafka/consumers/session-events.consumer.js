import { SessionEventTypes, Topics } from "common-contracts";
import { messageType } from "common-websocket";
import {
  getSessionSockets,
  getSocketContext,
  get as getSocketByUserId,
  addParticipant,
  removeParticipant,
  initSessionParticipants,
  deleteParticipants,
} from "../../../lib/connection-store.js";
import { broadcastToSession } from "../../../lib/messaging.js";
import {
  deleteSessionCapacity,
  setSessionCapacity,
} from "../../../lib/session-capacity-store.js";
import logger from "../../../logger.js";
import {
  userJoinSession,
  userLeaveSession,
} from "../../../handlers/session-membership.handler.js";

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
    const topics = [Topics.USER_EVENTS, Topics.QUIZZ_EVENTS];
    for (const topic of topics) {
      this.kafkaConsumer.addHandler(topic, async (message) => {
        await this.handleEvent(message);
      });
    }
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

      case SessionEventTypes.SESSION_STARTED:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling SESSION_STARTED event",
        );
        this.onSessionStarted(payload);
        break;

      case SessionEventTypes.SESSION_NEXT_QUESTION:
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling SESSION_NEXT_QUESTION event",
        );
        this.onNextQuestion(payload);
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
        logger.info(
          logCtx,
          "DEBUG [ws-service] Handling QUIZ_RESPONSE_SUBMITTED event",
        );
        break;

      default:
        logger.warn(logCtx, "DEBUG [ws-service] Unknown event type received");
    }
  }

  /**
   * @param {import("common-contracts").SessionStartedEventPayload} payload
   * @returns {void}
   */
  onSessionStarted(payload) {
    const sessionId = payload?.session_id;
    if (!sessionId) {
      return;
    }

    logger.info({ sessionId }, "Broadcasting session start to all clients");

    /** @type {import("common-websocket").ServerToClientMessage} */
    const message = {
      type: messageType.SESSION_STARTED,
      payload: {
        sessionId,
      },
    };

    broadcastToSession(sessionId, message, null);
  }

  /**
   * @param {import("common-contracts").SessionNextQuestionEventPayload} payload
   * @returns {void}
   */
  onNextQuestion(payload) {
    const sessionId = payload?.session_id;
    if (!sessionId) {
      return;
    }

    logger.info({ sessionId }, "Broadcasting next question to all clients");

    /** @type {import("common-websocket").ServerToClientMessage} */
    const message = {
      type: messageType.SESSION_NEXT_QUESTION,
      payload: {
        sessionId,
        question_id: payload.question_id,
      },
    };

    broadcastToSession(sessionId, message, null);
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
    initSessionParticipants(sessionId);
    addParticipant(sessionId, {
      participant_id: participantId,
      nickname,
      role: "owner",
    });

    logger.info(
      { sessionId, ownerId: participantId, nickname },
      "DEBUG [ws-service] Session state initialized successfully from SESSION_CREATED event",
    );
  }

  /**
   * @param {import("common-contracts").ParticipantJoinedEventPayload | import("common-contracts").ParticipantLeftEventPayload} payload
   * @param {import("common-websocket").messageType['USER_ONLINE'] | import("common-websocket").messageType['USER_OFFLINE']} wsMessageType
   * @returns {void}
   */
  notifyParticipants(payload, wsMessageType) {
    const sessionId = payload?.session_id;
    const participantId = payload?.participant_id;
    const nickname = payload?.nickname;
    const role = payload?.role;

    logger.info(
      { sessionId, participantId, nickname, wsMessageType },
      "DEBUG [ws-service] Processing participant event for broadcast",
    );

    if (!sessionId || !participantId || !nickname) {
      logger.warn(
        { payload },
        "DEBUG [ws-service] Missing required fields in participant event payload",
      );
      return;
    }

    if (wsMessageType === messageType.USER_ONLINE) {
      addParticipant(sessionId, {
        participant_id: participantId,
        nickname,
        role,
      });
    } else {
      removeParticipant(sessionId, participantId);
    }

    // If the participant has an active websocket connection on this service,
    // prefer to use the existing socket handlers so the local socket context
    // state stays consistent. Otherwise broadcast the event to session sockets
    // so connected clients are informed about the change.
    const participantSocket = getSocketByUserId(participantId);
    let handledLocally = false;

    try {
      if (wsMessageType === messageType.USER_ONLINE && participantSocket) {
        userJoinSession(participantSocket, sessionId);
        handledLocally = true;
      }

      if (wsMessageType === messageType.USER_OFFLINE && participantSocket) {
        // Participant left — use server-side leave handler to update context
        // and broadcast via the normal path, but only if they are actually
        // locally in the session they are leaving.
        const context = getSocketContext(participantSocket);
        if (context && context.sessionId === sessionId) {
          userLeaveSession(participantSocket);
          handledLocally = true;
        }
      }
    } catch (error) {
      logger.warn(
        { error, sessionId, participantId },
        "Failed to invoke local session membership handler",
      );
      handledLocally = false;
    }

    if (!handledLocally) {
      logger.info(
        { sessionId, participantId, nickname },
        "DEBUG [ws-service] Broadcasting participant event to session sockets",
      );
      broadcastToSession(
        sessionId,
        {
          type: wsMessageType,
          payload: {
            participant_id: participantId,
            nickname: nickname,
            role: payload.role,
          },
        },
        null,
      );
    }
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

    deleteParticipants(sessionId);
    deleteSessionCapacity(sessionId);
    logger.info(
      { sessionId, reason },
      "Session destroyed and participants kicked",
    );
  }
}
