const clients = new Map();
const socketContexts = new Map();

/**
 * @param {string} userId
 * @param {import("ws").WebSocket} ws
 * @returns {void}
 */
function add(userId, ws) {
  const existingSocket = clients.get(userId);
  if (existingSocket && existingSocket !== ws) {
    socketContexts.delete(existingSocket);
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
    socketContexts.delete(ws);
    return;
  }

  if (existingSocket === ws) {
    clients.delete(userId);
  }
  socketContexts.delete(ws);
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
 * @param {string | null} roomId
 * @returns {import("common-websocket").SocketContext | null}
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
