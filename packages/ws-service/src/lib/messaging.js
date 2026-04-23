import {
  clients,
  getSessionSockets,
  getSocketContext,
} from "./connection-store.js";
import { messageType } from "common-websocket";

/**
 * @param {import("common-websocket").ServerToClientMessage} message
 * @param {string?} excludeUserId
 * sends a message to all connected clients, except the one with the specified userId (if provided)
 */
function broadcast(message, excludeUserId) {
  for (const [userId, socket] of clients.entries()) {
    if (userId !== excludeUserId) {
      socket.send(JSON.stringify(message));
    }
  }
}

/**
 * @param {string} senderId
 * @param {import("common-websocket").ChatMessagePayload} message
 * @param {string} receiverId
 * @returns {boolean}
 */
function sendMessageToUser(senderId, message, receiverId) {
  const socket = clients.get(receiverId);
  if (!socket) {
    return false;
  }

  socket.send(
    JSON.stringify({
      type: messageType.CHAT_MESSAGE,
      payload: {
        ...message,
        senderId: senderId,
      },
    }),
  );

  return true;
}

/**
 * @param {string} sessionId
 * @param {import("common-websocket").ServerToClientMessage} message
 * @param {string?} excludeUserId
 * @returns {void}
 */
function broadcastToSession(sessionId, message, excludeUserId) {
  const sockets = getSessionSockets(sessionId);
  console.log(`there are ${sockets.size} sockets in session ${sessionId}`);

  for (const socket of sockets) {
    const socketContext = getSocketContext(socket);
    const socketUserId = socketContext?.userId;
    console.log("Broadcasting message to session", sessionId, socketUserId);
    if (excludeUserId && socketUserId === excludeUserId) {
      continue;
    }
    socket.send(JSON.stringify(message));
  }
}

export { broadcast, broadcastToSession, sendMessageToUser };
