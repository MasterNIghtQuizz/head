import {
  add,
  get,
  remove,
  setSocketContext,
  getSocketContext,
  removeParticipant,
} from "../lib/connection-store.js";
import { broadcastToSession } from "../lib/messaging.js";
import { UserRole } from "common-auth";
import { messageType } from "common-websocket";
import { handleSessionDeparture } from "./session-membership.handler.js";
import logger from "../logger.js";

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("http").IncomingMessage} req
 * @returns {{ userId: string, userName: string, sessionId: string | null } | null}
 */
function userConnect(ws, req) {
  logger.debug({}, `raw headers: ${JSON.stringify(req.headers)}`);

  if (!req.url) {
    logger.error("URL manquante dans la requete\n");
    ws.close(1002, "URL manquante");
    return null;
  }
  const forwardedUserId = req.headers["x-user-id"];
  const forwardedUserRole = req.headers["x-user-role"];

  if (Array.isArray(forwardedUserId)) {
    logger.error("Header x-user-id invalide (array non supporte)");
    ws.close(1002, "Header x-user-id invalide");
    return null;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const userName = url.searchParams.get("userName") || "anonymous";
  logger.info(
    {},
    `access token from query params: ${url.searchParams.get("access-token")}`,
  );

  if (!forwardedUserId) {
    logger.error("Header x-user-id manquant dans la requete");
    ws.close(1002, "Header x-user-id manquant");
    return null;
  }

  const userId = forwardedUserId;
  const role =
    typeof forwardedUserRole === "string" &&
    /** @type {string[]} */ (Object.values(UserRole)).includes(forwardedUserRole)
      ? forwardedUserRole
      : null;
  logger.info(`trying to connect user: ${userName} (ID: ${userId})`);

  add(userId, ws);
  setSocketContext(ws, {
    userId,
    userName,
    sessionId: null,
    role,
  });

  return { userId, userName, sessionId: null };
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

  if (!context?.sessionId) {
    return;
  }

  if (get(userId)) {
    return;
  }

  removeParticipant(context.sessionId, userId);
  logger.info(
    { sessionId: context.sessionId, userId },
    "User removed from session due to disconnect",
  );

  /** @type {import("common-websocket").ServerToClientMessage} */
  const offlineMessage = {
    type: messageType.USER_OFFLINE,
    payload: {
      participant_id: userId,
      nickname: userName,
      role: context.role || undefined,
    },
  };

  broadcastToSession(context.sessionId, offlineMessage, userId);

  handleSessionDeparture(context.sessionId, userId);
}

export { userConnect, userDisconnect };
