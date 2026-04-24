import {
  add,
  get,
  remove,
  setSocketContext,
  getSocketContext,
  findNicknameFallback,
  deleteSocketContext,
} from "../lib/connection-store.js";

import { broadcastToSession } from "../lib/messaging.js";
import { messageType } from "common-websocket";
import { handleSessionDeparture } from "./session-membership.handler.js";
import logger from "../logger.js";

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("http").IncomingMessage} req
 * @returns {{ userId: string, userName: string, role: string | null, sessionId: string | null } | null}

 */
function userConnect(ws, req) {
  if (!req.url) {
    logger.error("URL manquante dans la requete");
    ws.close(1002, "URL manquante");
    return null;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const userName = url.searchParams.get("userName") || "anonymous";

  let userId = Array.isArray(req.headers["x-user-id"])
    ? req.headers["x-user-id"][0]
    : req.headers["x-user-id"];

  let role = Array.isArray(req.headers["x-user-role"])
    ? req.headers["x-user-role"][0]
    : req.headers["x-user-role"];

  let sessionId = url.searchParams.get("sessionId");

  if (!userId) {
    const token = url.searchParams.get("game-token");

    if (token) {
      try {
        const payloadPart = token.split(".")[1];
        if (payloadPart) {
          const payload = JSON.parse(
            Buffer.from(payloadPart, "base64").toString(),
          );
          userId = payload.participantId || payload.userId;
          role = payload.role;
          sessionId = payload.sessionId || sessionId;
          logger.debug(
            { userId, role, sessionId },
            "Extracted identity from token in URL",
          );
        }
      } catch (e) {
        // @ts-ignore
        logger.debug({ err: e.message }, "Failed to decode token from URL");
      }
    }
  }

  if (!userId) {
    logger.warn(
      { url: req.url },
      "Connection rejected: No user identity found",
    );
    ws.close(1002, "User identity missing");
    return null;
  }

  const finalRole = typeof role === "string" ? role.toLowerCase() : null;

  let finalUserName = userName;
  if (userName.toLowerCase() === "anonymous") {
    const recovered = findNicknameFallback(userId);
    if (recovered) {
      logger.info(
        { userId, recovered },
        "Recovered nickname for anonymous user",
      );
      finalUserName = recovered;
    } else if (finalRole === "moderator") {
      finalUserName = "Host";
    }
  }

  logger.debug(
    { userName: finalUserName, userId, role: finalRole },
    "User connecting to WebSocket",
  );

  add(userId, ws);
  setSocketContext(ws, {
    userId,
    userName: finalUserName,
    sessionId: sessionId,
    role: finalRole,
  });

  return { userId, userName: finalUserName, role: finalRole, sessionId };
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} userId
 * @param {string} _userName
 * @returns {void}
 */
function userDisconnect(ws, userId, _userName) {
  const context = getSocketContext(ws);
  remove(userId, ws);

  if (!context?.sessionId) {
    return;
  }

  if (get(userId)) {
    return;
  }

  logger.info(
    { sessionId: context.sessionId, userId },
    "User disconnected from session (staying in participant list)",
  );

  /** @type {import("common-websocket").ServerToClientMessage} */
  const offlineMessage = {
    type: messageType.USER_OFFLINE,
    payload: {
      participant_id: userId,
    },
  };

  broadcastToSession(context.sessionId, offlineMessage, userId);

  handleSessionDeparture(context.sessionId, userId);
  deleteSocketContext(ws);
}

export { userConnect, userDisconnect };
