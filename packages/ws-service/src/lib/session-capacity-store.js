import { sessionState } from "common-websocket";

const sessionMetadata = new Map();

/**
 * @param {string} sessionId
 * @returns {number | null}
 */
function getSessionCapacity(sessionId) {
  return sessionMetadata.get(sessionId)?.maxUsers ?? null;
}

/**
 * @param {string} sessionId
 * @param {number} maxUsers
 * @param {boolean} [started=false]
 * @param {string | null} [ownerId=null]
 * @returns {void}
 */
function setSessionCapacity(
  sessionId,
  maxUsers,
  started = false,
  ownerId = null,
) {
  sessionMetadata.set(sessionId, { maxUsers, started, ownerId });
}

/**
 * @param {string} sessionId
 * @returns {string | null}
 */
function getSessionOwnerId(sessionId) {
  return sessionMetadata.get(sessionId)?.ownerId ?? null;
}

/**
 * @param {string} sessionId
 * @param {string} ownerId
 * @returns {boolean}
 */
function setSessionOwnerId(sessionId, ownerId) {
  const metadata = sessionMetadata.get(sessionId);
  if (!metadata) {
    return false;
  }

  sessionMetadata.set(sessionId, {
    ...metadata,
    ownerId,
  });
  return true;
}

/**
 * @param {string} sessionId
 * @returns {boolean}
 */
function isSessionStarted(sessionId) {
  return sessionMetadata.get(sessionId)?.started === true;
}

/**
 * @param {string} sessionId
 * @param {boolean} started
 * @returns {boolean}
 */
function setSessionStarted(sessionId, started) {
  const metadata = sessionMetadata.get(sessionId);
  if (!metadata) {
    return false;
  }

  sessionMetadata.set(sessionId, {
    ...metadata,
    started,
  });
  return true;
}

/**
 * @param {string} sessionId
 * @param {number} userCount
 * @returns {import("common-websocket").SessionState | null}
 */
function getSessionState(sessionId, userCount) {
  const metadata = sessionMetadata.get(sessionId);
  if (!metadata) {
    return null;
  }

  if (metadata.started) {
    return sessionState.STARTED;
  }

  if (userCount >= metadata.maxUsers) {
    return sessionState.FULL;
  }

  return sessionState.NOT_FULL;
}

/**
 * @param {string} sessionId
 * @returns {void}
 */
function deleteSessionCapacity(sessionId) {
  sessionMetadata.delete(sessionId);
}

export {
  deleteSessionCapacity,
  getSessionCapacity,
  getSessionOwnerId,
  getSessionState,
  isSessionStarted,
  setSessionCapacity,
  setSessionOwnerId,
  setSessionStarted,
};
