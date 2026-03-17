const clients = new Map();

/**
 * @param {string} userId
 * @param {WebSocket} ws
 * @returns {void}
 */
function add(userId, ws) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(ws);
}

/**
 * @param {string} userId
 * @param {WebSocket} ws
 * @returns {void}
 */
function remove(userId, ws) {
  const set = clients.get(userId);
  if (!set) {
    return;
  }

  set.delete(ws);

  if (set.size === 0) {
    clients.delete(userId);
  }
}

/**
 * @param {string} userId
 * @returns {Set<WebSocket>}
 */
function get(userId) {
  return clients.get(userId) || new Set();
}

export { add, remove, get, clients };
