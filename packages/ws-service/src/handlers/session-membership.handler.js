import {
  getSessionSockets,
  getSocketContext,
  setSocketSession,
} from "../lib/connection-store.js";
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
import { errorType, messageType, sessionState } from "common-websocket";

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} sessionId
 * @returns {{ userId: string, userName: string, sessionId: string } | { error: string } | null}
 */
function userJoinSession(ws, sessionId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.sessionId === sessionId) {
    return {
      userId: context.userId,
      userName: context.userName,
      sessionId,
    };
  }

  const existingCapacity = getSessionCapacity(sessionId);
  if (existingCapacity === null) {
    return { error: errorType.SESSION_NOT_FOUND };
  }

  const sessionSockets = getSessionSockets(sessionId);
  const state = getSessionState(sessionId, sessionSockets.size);
  if (state === sessionState.STARTED) {
    return { error: errorType.SESSION_STARTED };
  }

  if (state === sessionState.FULL) {
    return { error: errorType.SESSION_FULL };
  }

  const previousSessionId = context.sessionId;
  const updatedContext = setSocketSession(ws, sessionId);
  if (!updatedContext) {
    return null;
  }

  if (previousSessionId && previousSessionId !== sessionId) {
    broadcastToSession(
      previousSessionId,
      {
        type: messageType.USER_OFFLINE,
        payload: { userId: context.userId, userName: context.userName },
      },
      context.userId,
    );
    handleSessionDeparture(previousSessionId, context.userId);
  }

  broadcastToSession(
    sessionId,
    {
      type: messageType.USER_ONLINE,
      payload: {
        userId: updatedContext.userId,
        userName: updatedContext.userName,
      },
    },
    updatedContext.userId,
  );

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    sessionId,
  };
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} sessionId
 * @param {number} maxUsers
 * @returns {{ userId: string, userName: string, sessionId: string } | { error: string } | null}
 */
function userCreateSession(ws, sessionId, maxUsers) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
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
 * @returns {{ sessionId: string, ownerId: string } | { error: string } | null}
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
  broadcastToSession(
    sessionId,
    {
      type: messageType.SESSION_STARTED,
      payload: { sessionId, ownerId },
    },
    null,
  );

  return { sessionId, ownerId };
}

/**
 * @param {string} sessionId
 * @param {string} leavingUserId
 * @returns {void}
 */
function handleSessionDeparture(sessionId, leavingUserId) {
  const sockets = Array.from(getSessionSockets(sessionId));
  if (sockets.length === 0) {
    deleteSessionCapacity(sessionId);
    return;
  }

  const ownerId = getSessionOwnerId(sessionId);
  if (ownerId !== leavingUserId) {
    return;
  }

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

  if (!newOwnerId) {
    deleteSessionCapacity(sessionId);
    return;
  }

  setSessionOwnerId(sessionId, newOwnerId);
  broadcastToSession(
    sessionId,
    {
      type: messageType.SESSION_OWNER_CHANGED,
      payload: { sessionId, ownerId: newOwnerId },
    },
    null,
  );
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

  broadcastToSession(
    leftSessionId,
    {
      type: messageType.USER_OFFLINE,
      payload: {
        userId: updatedContext.userId,
        userName: updatedContext.userName,
      },
    },
    updatedContext.userId,
  );

  const socketsLeft = getSessionSockets(leftSessionId).size;
  if (socketsLeft === 0) {
    deleteSessionCapacity(leftSessionId);
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
