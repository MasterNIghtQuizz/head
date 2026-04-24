const sessionTimers = new Map();

/**
 * Store the activation time of the current question.
 * @param {string} sessionId
 * @param {number} timestamp (ms)
 */
export function setSessionActivatedAt(sessionId, timestamp) {
  sessionTimers.set(sessionId, timestamp);
}

/**
 * Get the activation time of the current question.
 * @param {string} sessionId
 * @returns {number | null}
 */
export function getSessionActivatedAt(sessionId) {
  return sessionTimers.get(sessionId) || null;
}

/**
 * Clear timer data when session ends.
 * @param {string} sessionId
 */
export function deleteSessionTimer(sessionId) {
  sessionTimers.delete(sessionId);
}
