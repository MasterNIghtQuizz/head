import logger from "../logger.js";

/** @type {Map<string, import("ws").WebSocket>} */
const clients = new Map();
/** @type {WeakMap<import("ws").WebSocket, import("common-websocket").SocketContext>} */
const socketContexts = new WeakMap();
/** @type {Map<string, Array<{ participant_id: string, nickname: string, role: string | null }>>} */
const sessionParticipants = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const pendingDepartures = new Map();

/**
 * @param {string} userId
 * @param {import("ws").WebSocket} ws
 * @returns {void}
 */
function add(userId, ws) {
  const existingSocket = clients.get(userId);
  if (existingSocket && existingSocket !== ws) {
    existingSocket.close(1008, "another_connection_opened");
  }

  clients.set(userId, ws);
}

/**
 * @param {string} userId
 * @param {import("ws").WebSocket} ws
 * @returns {void}
 */
function remove(userId, ws) {
  const existingSocket = clients.get(userId);
  if (!existingSocket) {
    return;
  }

  if (existingSocket === ws) {
    clients.delete(userId);
  }
}

/**
 * @param {string} userId
 * @returns {import("ws").WebSocket | null}
 */
function get(userId) {
  return clients.get(userId) || null;
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").SocketContext} context
 * @returns {void}
 */
function setSocketContext(ws, context) {
  socketContexts.set(ws, context);
}

/**
 * @param {import("ws").WebSocket} ws
 * @returns {import("common-websocket").SocketContext | null}
 */
function getSocketContext(ws) {
  return socketContexts.get(ws) || null;
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string | null} sessionId
 * @returns {import("common-websocket").SocketContext | null}
 */
function setSocketSession(ws, sessionId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  const updated = {
    ...context,
    sessionId,
  };
  socketContexts.set(ws, updated);
  return updated;
}

/**
 * @param {string} sessionId
 * @returns {Set<import("ws").WebSocket>}
 */
function getSessionSockets(sessionId) {
  const participants = getParticipants(sessionId);
  const sockets = new Set();
  const allAuthenticatedUserIds = Array.from(clients.keys());

  logger.debug(
    {
      sessionId,
      participantCount: participants.length,
      participantsInRoom: participants.map((p) => p.participant_id),
      allConnectedUserIds: allAuthenticatedUserIds,
    },
    "DEBUG [getSessionSockets] Analyzing session sockets",
  );

  for (const p of participants) {
    const ws = clients.get(p.participant_id);
    if (ws) {
      sockets.add(ws);
    } else {
      logger.warn(
        {
          participantId: p.participant_id,
          nickname: p.nickname,
          sessionId,
        },
        "DEBUG [getSessionSockets] Participant has no active socket",
      );
    }
  }

  return sockets;
}

/**
 * Initialize an empty participant list for a session.
 * @param {string} sessionId
 */
function initSessionParticipants(sessionId) {
  if (!sessionParticipants.has(sessionId)) {
    sessionParticipants.set(sessionId, []);
    logger.debug(
      { sessionId },
      "Initialized empty participant list for session",
    );
  }
}

/**
 * Add a participant to an in-memory participant list for a session.
 * @param {string} sessionId
 * @param {{ participant_id: string, nickname: string, role: string | null }} participant
 * @returns {boolean} true if added or updated
 */
function addParticipant(sessionId, participant) {
  let list = sessionParticipants.get(sessionId);
  if (!list) {
    list = [];
    sessionParticipants.set(sessionId, list);
    logger.debug({ sessionId }, "Initialized participant list for session");
  }
  const existingIndex = list.findIndex(
    (p) => p.participant_id === participant.participant_id,
  );
  if (existingIndex !== -1) {
    const existing = list[existingIndex];
    // Don't overwrite a real nickname with "Anonymous"
    const isNewAnonymous =
      participant.nickname.toLowerCase() === "anonymous" ||
      participant.nickname.toLowerCase() === "anonymous";
    const finalNickname =
      isNewAnonymous &&
      existing.nickname &&
      existing.nickname.toLowerCase() !== "anonymous"
        ? existing.nickname
        : participant.nickname;

    list[existingIndex] = {
      ...existing,
      ...participant,
      nickname: finalNickname,
    };
    logger.debug(
      {
        sessionId,
        participantId: participant.participant_id,
        nickname: finalNickname,
      },
      "Updated participant in session list",
    );
    return true;
  }

  list.push(participant);
  logger.info(
    {
      sessionId,
      participantId: participant.participant_id,
      role: participant.role,
    },
    "Added participant to session list",
  );
  return true;
}

/**
 * Remove a participant from the in-memory participant list for a session.
 * @param {string} sessionId
 * @param {string} participantId
 * @returns {boolean} true if removed, false otherwise
 */
function removeParticipant(sessionId, participantId) {
  const list = sessionParticipants.get(sessionId);
  if (!list) {
    return false;
  }
  const newList = list.filter((p) => p.participant_id !== participantId);
  if (newList.length === list.length) {
    return false;
  }
  sessionParticipants.set(sessionId, newList);
  logger.info(
    { sessionId, participantId },
    "Removed participant from session list",
  );
  return true;
}

/**
 * Get persisted participants for a session.
 * @param {string} sessionId
 * @returns {Array<{ participant_id: string, nickname: string, role: string | null }>}
 */
function getParticipants(sessionId) {
  return sessionParticipants.get(sessionId) || [];
}

/**
 * @param {string} userId
 * @returns {string | null}
 */
function findNicknameFallback(userId) {
  for (const list of sessionParticipants.values()) {
    const p = list.find((item) => item.participant_id === userId);
    if (p && p.nickname && p.nickname.toLowerCase() !== "anonymous") {
      return p.nickname;
    }
  }
  return null;
}

/**
 * Delete participants list for a session.
 * @param {string} sessionId
 */
function deleteParticipants(sessionId) {
  sessionParticipants.delete(sessionId);
}

/**
 * @param {import("ws").WebSocket} ws
 * @returns {void}
 */
function deleteSocketContext(ws) {
  socketContexts.delete(ws);
}

/**
 * @param {string} userId
 * @param {NodeJS.Timeout} timeoutId
 */
export function registerPendingDeparture(userId, timeoutId) {
  clearPendingDeparture(userId);
  pendingDepartures.set(userId, timeoutId);
}

/**
 * @param {string} userId
 */
export function clearPendingDeparture(userId) {
  const existing = pendingDepartures.get(userId);
  if (existing) {
    clearTimeout(existing);
    pendingDepartures.delete(userId);
    return true;
  }
  return false;
}

export {
  add,
  remove,
  get,
  clients,
  setSocketContext,
  getSocketContext,
  deleteSocketContext,
  setSocketSession,
  getSessionSockets,
  initSessionParticipants,
  addParticipant,
  removeParticipant,
  getParticipants,
  deleteParticipants,
  findNicknameFallback,
};
