const clients = new Map();
const socketContexts = new Map();

/**
 * @typedef SocketContext
 * @property {string} userId
 * @property {string} userName
 * @property {string | null} roomId
 */

/**
 * @param {string} userId
 * @param {import("ws").WebSocket} ws
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
 * @param {import("ws").WebSocket} ws
 * @returns {void}
 */
function remove(userId, ws) {
  const set = clients.get(userId);
  if (!set) {
    socketContexts.delete(ws);
    return;
  }

  set.delete(ws);
  socketContexts.delete(ws);

  if (set.size === 0) {
    clients.delete(userId);
  }
}

/**
 * @param {string} userId
 * @returns {Set<import("ws").WebSocket>}
 */
function get(userId) {
  return clients.get(userId) || new Set();
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {SocketContext} context
 * @returns {void}
 */
function setSocketContext(ws, context) {
  socketContexts.set(ws, context);
}

/**
 * @param {import("ws").WebSocket} ws
 * @returns {SocketContext | null}
 */
function getSocketContext(ws) {
  return socketContexts.get(ws) || null;
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string | null} roomId
 * @returns {SocketContext | null}
 */
function setSocketRoom(ws, roomId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  const updated = {
    ...context,
    roomId,
  };
  socketContexts.set(ws, updated);
  return updated;
}

/**
 * @param {string} roomId
 * @returns {Set<import("ws").WebSocket>}
 */
function getRoomSockets(roomId) {
  const sockets = new Set();

  for (const [socket, context] of socketContexts.entries()) {
    if (context.roomId === roomId) {
      sockets.add(socket);
    }
  }

  return sockets;
}

export {
  add,
  remove,
  get,
  clients,
  setSocketContext,
  getSocketContext,
  setSocketRoom,
  getRoomSockets,
};
