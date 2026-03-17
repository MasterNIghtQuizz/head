import { IncomingMessage } from "node:http";
import { add, remove, clients } from "../lib/connectionRegistry.js";

/**
 * @param {WebSocket} ws
 * @param {IncomingMessage} req
 * @returns {boolean}
 */
function userConnect(ws, req) {
  if (!req.url) {
    console.error("URL manquante dans la requête");
    ws.close(1002, "URL manquante");
    return false;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userName = url.searchParams.get("userName");
  const userId = url.searchParams.get("userId");
  console.log(`trying to connect user: ${userName} (ID: ${userId})`);
  if (!userId) {
    console.error("ID utilisateur manquant dans la requête");
    ws.close(1002, "ID utilisateur manquant");
    return false;
  }
  add(userId, ws);
  broadcast(
    {
      type: "user_online",
      payload: { userId: userId, userName: userName },
    },
    userId,
  );
  return true;
}

/**
 * @param {WebSocket} ws
 * @param {string} userId
 * @param {string} userName
 * @returns {void}
 */
function userDisconnect(ws, userId, userName) {
  remove(userId, ws);
  broadcast(
    {
      type: "user_offline",
      payload: { userId: userId, userName: userName },
    },
    userId,
  );
}

/**
 * @param {Object} message
 * @param {string?} excludeUserId
 * @return {void}
 */
function broadcast(message, excludeUserId = null) {
  for (const [userId, sockets] of clients.entries()) {
    if (userId === excludeUserId) {
      continue;
    }
    sockets.forEach((/** @type {WebSocket} */ socket) =>
      socket.send(JSON.stringify(message)),
    );
  }
}

module.exports = { userConnect, userDisconnect };
