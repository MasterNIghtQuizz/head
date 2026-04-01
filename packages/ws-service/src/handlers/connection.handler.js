import {
  add,
  get,
  remove,
  setSocketContext,
  getSocketContext,
} from "../lib/connection-store.js";
import { broadcastToRoom } from "../lib/messaging.js";
import { messageType } from "common-websocket";
import { handleRoomDeparture } from "./room-membership.handler.js";
import logger from "../logger.js";

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("http").IncomingMessage} req
 * @returns {{ userId: string, userName: string, roomId: string | null } | null}
 */
function userConnect(ws, req) {
  logger.debug({}, `raw headers: ${JSON.stringify(req.headers)}`);

  if (!req.url) {
    logger.error("URL manquante dans la requete\n");
    ws.close(1002, "URL manquante");
    return null;
  }
  const forwardedUserId = req.headers["x-user-id"];
  const fowardedUserRole = req.headers["x-user-role"];

  if (Array.isArray(forwardedUserId)) {
    logger.error("Header x-user-id invalide (array non supporte)");
    ws.close(1002, "Header x-user-id invalide");
    return null;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const userName = url.searchParams.get("userName") || "anonymous";

  if (!forwardedUserId) {
    logger.error("Header x-user-id manquant dans la requete");
    ws.close(1002, "Header x-user-id manquant");
    return null;
  }

  const userId = forwardedUserId;
  logger.info(`trying to connect user: ${userName} (ID: ${userId})`);

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

  if (get(userId)) {
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

  handleRoomDeparture(context.roomId, userId);
}

export { userConnect, userDisconnect };
