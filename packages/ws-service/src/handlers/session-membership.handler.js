import {
  getSessionSockets,
  getSocketContext,
  setSocketSession,
  addParticipant,
  removeParticipant,
  getParticipants,
  clearPendingDeparture,
  registerPendingDeparture,
} from "../lib/connection-store.js";
import { getSessionActivatedAt } from "../lib/session-timer-store.js";
import { broadcastToSession } from "../lib/messaging.js";
import {
  deleteSessionCapacity,
  getSessionCapacity,
  getSessionOwnerId,
  getSessionState,
  setSessionCapacity,
  setSessionOwnerId,
  setSessionStarted,
} from "../lib/session-capacity-store.js";
import { UserRole } from "common-auth";
import { errorType, messageType, sessionState } from "common-websocket";
import logger from "../logger.js";

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} sessionId
 * @returns {{ userId: string, userName: string, sessionId: string, participants: Array<any>, activated_at: number | null } | { error: import("common-websocket").ErrorType } | null}

 */
function userJoinSession(ws, sessionId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  // Cancel any ghost departure for this user
  const wasPending = clearPendingDeparture(context.userId);
  if (wasPending) {
    logger.info(
      { userId: context.userId, sessionId },
      "User reconnected within grace period, cancelling departure",
    );
  }

  const existingCapacity = getSessionCapacity(sessionId);
  if (existingCapacity === null) {
    return { error: errorType.SESSION_NOT_FOUND };
  }

  if (context.sessionId === sessionId) {
    const participants = getParticipants(sessionId);
    const isAlreadyParticipant = participants.some(
      (p) => p.participant_id === context.userId,
    );

    if (!isAlreadyParticipant) {
      addParticipant(sessionId, {
        participant_id: context.userId,
        nickname: context.userName,
        role: context.role,
      });
    }

    return {
      userId: context.userId,
      userName: context.userName,
      sessionId,
      participants: getParticipants(sessionId),
      activated_at: getSessionActivatedAt(sessionId),
    };
  }

  const sessionSockets = getSessionSockets(sessionId);
  const state = getSessionState(sessionId, sessionSockets?.size || 0);

  if (state === sessionState.STARTED) {
    logger.warn(
      { sessionId, userId: context.userId },
      "Join attempt failed: Session already started",
    );
    return { error: errorType.SESSION_STARTED };
  }

  if (state === sessionState.FULL) {
    logger.warn(
      { sessionId, userId: context.userId },
      "Join attempt failed: Session is full",
    );
    return { error: errorType.SESSION_FULL };
  }

  const previousSessionId = context.sessionId;
  const updatedContext = setSocketSession(ws, sessionId);
  if (!updatedContext) {
    return null;
  }

  if (previousSessionId && previousSessionId !== sessionId) {
    logger.info(
      { previousSessionId, sessionId, userId: context.userId },
      "User switching sessions",
    );

    // Explicitly remove from old session's participant list
    removeParticipant(previousSessionId, context.userId);

    /** @type {import("common-websocket").ServerToClientMessage} */
    const offlineMessage = {
      type: messageType.USER_OFFLINE,
      payload: {
        participant_id: context.userId,
        nickname: context.userName,
        role: context.role || undefined,
      },
    };

    broadcastToSession(previousSessionId, offlineMessage, context.userId);
    handleSessionDeparture(previousSessionId, context.userId);
  }

  addParticipant(sessionId, {
    participant_id: updatedContext.userId,
    nickname: updatedContext.userName,
    role: updatedContext.role,
  });

  /** @type {import("common-websocket").ServerToClientMessage} */
  const onlineMessage = {
    type: messageType.USER_ONLINE,
    payload: {
      participant_id: updatedContext.userId,
      nickname: updatedContext.userName,
      role: updatedContext.role || undefined,
    },
  };

  broadcastToSession(sessionId, onlineMessage, updatedContext.userId);

  /** @type {import("common-websocket").ServerToClientMessage} */
  const participantsUpdateMessage = {
    type: messageType.PARTICIPANTS_UPDATE,
    payload: {
      sessionId,
      participants: getParticipants(sessionId),
      activated_at: getSessionActivatedAt(sessionId),
    },
  };

  broadcastToSession(sessionId, participantsUpdateMessage, null);

  logger.info(
    { sessionId, userId: updatedContext.userId },
    "User successfully joined session and list updated for everyone",
  );

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    sessionId,
    participants: getParticipants(sessionId),
    activated_at: getSessionActivatedAt(sessionId),
  };
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} sessionId
 * @param {number} maxUsers
 * @returns {{ userId: string, userName: string, sessionId: string } | { error: import("common-websocket").ErrorType } | null}
 */
function userCreateSession(ws, sessionId, maxUsers) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.role !== UserRole.MODERATOR) {
    return { error: errorType.CREATE_SESSION_FAILED };
  }

  if (getSessionCapacity(sessionId) !== null) {
    return { error: errorType.SESSION_ALREADY_EXISTS };
  }

  if (context.sessionId === sessionId) {
    return { error: errorType.SESSION_ALREADY_EXISTS };
  }

  setSessionCapacity(sessionId, maxUsers, false, context.userId);
  return userJoinSession(ws, sessionId);
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} sessionId
 * @returns {{ sessionId: string, ownerId: string } | { error: import("common-websocket").ErrorType } | null}
 */
function userStartSession(ws, sessionId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.sessionId !== sessionId) {
    return { error: errorType.SESSION_NOT_FOUND };
  }

  const ownerId = getSessionOwnerId(sessionId);
  if (!ownerId) {
    return { error: errorType.SESSION_NOT_FOUND };
  }

  if (ownerId !== context.userId) {
    return { error: errorType.NOT_SESSION_OWNER };
  }

  const state = getSessionState(sessionId, getSessionSockets(sessionId).size);
  if (state === sessionState.STARTED) {
    return { error: errorType.SESSION_ALREADY_STARTED };
  }

  setSessionStarted(sessionId, true);
  /** @type {import("common-websocket").ServerToClientMessage} */
  const startedMessage = {
    type: messageType.SESSION_STARTED,
    payload: { sessionId, ownerId },
  };

  broadcastToSession(sessionId, startedMessage, null);

  return { sessionId, ownerId };
}

/**
 * @param {string} sessionId
 * @param {string} leavingUserId
 * @returns {void}
 */
function handleSessionDeparture(sessionId, leavingUserId) {
  logger.info(
    { leavingUserId, sessionId },
    "Scheduling session departure (grace period)",
  );

  const timeoutId = setTimeout(() => {
    logger.info(
      { leavingUserId, sessionId },
      "Grace period expired, finalizing departure",
    );

    removeParticipant(sessionId, leavingUserId);
    const sockets = Array.from(getSessionSockets(sessionId));

    if (sockets.length === 0) {
      deleteSessionCapacity(sessionId);
      return;
    }

    const ownerId = getSessionOwnerId(sessionId);
    if (ownerId === leavingUserId) {
      const startIndex = Math.floor(Math.random() * sockets.length);
      let newOwnerId = null;
      for (let i = 0; i < sockets.length; i += 1) {
        const socket = sockets[(startIndex + i) % sockets.length];
        const socketContext = getSocketContext(socket);
        if (socketContext?.userId) {
          newOwnerId = socketContext.userId;
          break;
        }
      }

      if (newOwnerId) {
        setSessionOwnerId(sessionId, newOwnerId);
        /** @type {import("common-websocket").ServerToClientMessage} */
        const ownerChangeMessage = {
          type: messageType.SESSION_OWNER_CHANGED,
          payload: { sessionId, ownerId: newOwnerId },
        };
        broadcastToSession(sessionId, ownerChangeMessage, null);
      }
    }

    // Broadcast the offline message
    const offlineMessage = {
      type: messageType.USER_OFFLINE,
      payload: { participant_id: leavingUserId },
    };
    broadcastToSession(sessionId, offlineMessage, null);

    // Broadcast the full list to everyone to ensure sync
    const participantsUpdateMessage = {
      type: messageType.PARTICIPANTS_UPDATE,
      payload: {
        sessionId,
        participants: getParticipants(sessionId),
        activated_at: getSessionActivatedAt(sessionId),
      },
    };
    broadcastToSession(sessionId, participantsUpdateMessage, null);

    clearPendingDeparture(leavingUserId);
  }, 2000);

  registerPendingDeparture(leavingUserId, timeoutId);
}

/**
 * Leaves the current session for a user socket.
 * Emits USER_OFFLINE in the session being left and clears the sessionId on the
 * socket context.
 *
 * @param {import("ws").WebSocket} ws
 * @returns {{ userId: string, userName: string, sessionId: null, leftSessionId: string } | null}
 */
function userLeaveSession(ws) {
  const context = getSocketContext(ws);
  if (!context || !context.sessionId) {
    return null;
  }

  const leftSessionId = context.sessionId;
  const updatedContext = setSocketSession(ws, null);
  if (!updatedContext) {
    return null;
  }

  const socketsLeft = getSessionSockets(leftSessionId).size;

  /** @type {import("common-websocket").ServerToClientMessage} */
  const offlineMessage = {
    type: messageType.USER_OFFLINE,
    payload: {
      participant_id: updatedContext.userId,
    },
  };

  broadcastToSession(leftSessionId, offlineMessage, updatedContext.userId);

  if (socketsLeft === 0) {
    logger.info(
      { sessionId: leftSessionId },
      "Last user left, deleting session capacity",
    );
    deleteSessionCapacity(leftSessionId);
    removeParticipant(leftSessionId, updatedContext.userId);
  } else {
    handleSessionDeparture(leftSessionId, updatedContext.userId);
  }

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    sessionId: null,
    leftSessionId,
  };
}

export {
  handleSessionDeparture,
  userCreateSession,
  userJoinSession,
  userLeaveSession,
  userStartSession,
};
