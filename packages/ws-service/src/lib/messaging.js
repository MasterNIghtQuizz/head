import {
  clients,
  getRoomSockets,
  getSocketContext,
} from "./connection-registry.js";
import { messageType } from "./types/message-type.js";

/**
 * @param {Object} message
 * @param {string?} excludeUserId
 * sends a message to all connected clients, except the one with the specified userId (if provided)
 */
function broadcast(message, excludeUserId) {
  for (const [userId, sockets] of clients.entries()) {
    if (userId !== excludeUserId) {
      for (const socket of sockets) {
        socket.send(JSON.stringify(message));
      }
    }
  }
}

/**
 * @param {string?} senderId
 * @param {Object} message
 * @param {string} receiverId
 * @returns {boolean}
 */
function sendMessageToUser(senderId, message, receiverId) {
  const sockets = clients.get(receiverId);
  if (!sockets || sockets.size === 0) {
    return false;
  }

  for (const socket of sockets) {
    socket.send(
      JSON.stringify({
        type: messageType.CHAT_MESSAGE,
        payload: {
          ...message,
          senderId: senderId ?? "anonymous",
        },
      }),
    );
  }

  return true;
}

/**
 * @param {string} roomId
 * @param {Object} message
 * @param {string?} excludeUserId
 * @returns {void}
 */
function broadcastToRoom(roomId, message, excludeUserId) {
  const sockets = getRoomSockets(roomId);

  for (const socket of sockets) {
    const socketContext = getSocketContext(socket);
    const socketUserId = socketContext?.userId;
    if (excludeUserId && socketUserId === excludeUserId) {
      continue;
    }
    socket.send(JSON.stringify(message));
  }
}

export { broadcast, broadcastToRoom, sendMessageToUser };
