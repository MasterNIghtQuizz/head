import { sendMessageToUser } from "../lib/messaging.js";
import {
  userCreateSession,
  userJoinSession,
  userStartSession,
} from "./session-membership.handler.js";
import { errorType, messageType } from "common-websocket";

/**
 * @param {import("ws").RawData} rawMessage
 * @returns {import("common-websocket").ClientToServerMessage | null}
 */
export function parseClientMessage(rawMessage) {
  try {
    const parsed = JSON.parse(rawMessage.toString());
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} senderId
 * @param {import("common-websocket").ChatMessagePayload} payload
 * @returns {void}
 */
export function handleDirectChatMessage(ws, senderId, payload) {
  if (!payload || typeof payload !== "object") {
    /** @type {import("common-websocket").ServerToClientMessage} */
    const errorMessage = {
      type: messageType.ERROR,
      payload: { reason: errorType.INVALID_PAYLOAD },
    };
    ws.send(JSON.stringify(errorMessage));
    return;
  }

  const receiverId = payload.receiverId;
  if (typeof receiverId !== "string" || receiverId.length === 0) {
    /** @type {import("common-websocket").ServerToClientMessage} */
    const errorMessage = {
      type: messageType.ERROR,
      payload: { reason: errorType.MISSING_RECEIVER_ID },
    };
    ws.send(JSON.stringify(errorMessage));
    return;
  }

  const delivered = sendMessageToUser(senderId, payload, receiverId);
  ws.send(
    JSON.stringify({
      type: delivered
        ? messageType.MESSAGE_DELIVERED
        : messageType.MESSAGE_NOT_DELIVERED,
      payload: { receiverId },
    }),
  );
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").JoinSessionPayload} payload
 * @returns {void}
 */
export function handleJoinSessionMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  const sessionId = payload.sessionId?.trim();
  if (!sessionId) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      }),
    );
    return;
  }

  const updatedUser = userJoinSession(ws, sessionId);
  if (!updatedUser || "error" in updatedUser) {
    /** @type {import("common-websocket").ServerToClientMessage} */
    const errorMessage = {
      type: messageType.ERROR,
      payload: {
        reason: updatedUser?.error ?? errorType.JOIN_SESSION_FAILED,
      },
    };
    ws.send(JSON.stringify(errorMessage));
    return;
  }

  /** @type {import("common-websocket").ServerToClientMessage} */
  const joinedMessage = {
    type: messageType.JOINED_SESSION,
    payload: {
      sessionId: updatedUser.sessionId,
      participants: updatedUser.participants,
      activated_at: updatedUser.activated_at,
    },
  };

  ws.send(JSON.stringify(joinedMessage));
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").CreateSessionPayload} payload
 * @returns {void}
 */
export function handleCreateSessionMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  const sessionId = payload.sessionId?.trim();
  if (!sessionId) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      }),
    );
    return;
  }

  const maxUsers = payload.max_users;
  if (!Number.isInteger(maxUsers) || maxUsers <= 0) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_OR_INVALID_MAX_USERS },
      }),
    );
    return;
  }

  const updatedUser = userCreateSession(ws, sessionId, maxUsers);
  if (!updatedUser || "error" in updatedUser) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: {
          reason: updatedUser?.error ?? errorType.CREATE_SESSION_FAILED,
        },
      }),
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: messageType.SESSION_CREATED,
      payload: { sessionId: updatedUser.sessionId, max_users: maxUsers },
    }),
  );
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").StartSessionPayload} payload
 * @returns {void}
 */
export function handleStartSessionMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  const sessionId = payload.sessionId?.trim();
  if (!sessionId) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      }),
    );
    return;
  }

  const startedSession = userStartSession(ws, sessionId);
  if (!startedSession || "error" in startedSession) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: {
          reason: startedSession?.error ?? errorType.START_SESSION_FAILED,
        },
      }),
    );
    return;
  }

  /** @type {import("common-websocket").ServerToClientMessage} */
  const startedMessage = {
    type: messageType.SESSION_STARTED,
    payload: {
      sessionId: startedSession.sessionId,
      ownerId: startedSession.ownerId,
    },
  };
  ws.send(JSON.stringify(startedMessage));
}
