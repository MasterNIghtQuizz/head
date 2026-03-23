import {
  add,
  remove,
  setSocketContext,
  getSocketContext,
  setSocketRoom,
} from "../lib/connection-registry.js";
import { broadcastToRoom } from "../lib/messaging.js";
import { messageType } from "../lib/types/message-type.js";

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("http").IncomingMessage} req
 * @returns {{ userId: string, userName: string, roomId: string | null } | null}
 */
function userConnect(ws, req) {
  if (!req.url) {
    process.stderr.write("URL manquante dans la requete\n");
    ws.close(1002, "URL manquante");
    return null;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userName = url.searchParams.get("userName") || "anonymous";
  const userId = url.searchParams.get("userId");
  process.stdout.write(`trying to connect user: ${userName} (ID: ${userId})\n`);
  if (!userId) {
    process.stderr.write("ID utilisateur manquant dans la requete\n");
    ws.close(1002, "ID utilisateur manquant");
    return null;
  }

  add(userId, ws);
  setSocketContext(ws, {
    userId,
    userName,
    roomId: null,
  });

  return { userId, userName, roomId: null };
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} userId
 * @param {string} userName
 * @returns {void}
 */
function userDisconnect(ws, userId, userName) {
  const context = getSocketContext(ws);
  remove(userId, ws);

  if (!context?.roomId) {
    return;
  }

  broadcastToRoom(
    context.roomId,
    {
      type: messageType.USER_OFFLINE,
      payload: { userId: userId, userName: userName },
    },
    userId,
  );
}

export { userConnect, userDisconnect };
