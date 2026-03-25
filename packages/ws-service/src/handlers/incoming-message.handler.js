import { sendMessageToUser } from "../lib/messaging.js";
import {
  userCreateRoom,
  userJoinRoom,
  userStartRoom,
} from "./room-membership.handler.js";
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
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  const receiverId = payload.receiverId;
  if (typeof receiverId !== "string" || receiverId.length === 0) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_RECEIVER_ID },
      }),
    );
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
 * @param {import("common-websocket").JoinRoomPayload} payload
 * @returns {void}
 */
export function handleJoinRoomMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  if (
    typeof payload.roomId !== "string" ||
    payload.roomId.trim().length === 0
  ) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
      }),
    );
    return;
  }

  const updatedUser = userJoinRoom(ws, payload.roomId);
  if (!updatedUser || "error" in updatedUser) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: {
          reason: updatedUser?.error ?? errorType.JOIN_ROOM_FAILED,
        },
      }),
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: messageType.JOINED_ROOM,
      payload: { roomId: updatedUser.roomId },
    }),
  );
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").CreateRoomPayload} payload
 * @returns {void}
 */
export function handleCreateRoomMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  if (
    typeof payload.roomId !== "string" ||
    payload.roomId.trim().length === 0
  ) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
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

  const updatedUser = userCreateRoom(ws, payload.roomId, maxUsers);
  if (!updatedUser || "error" in updatedUser) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: {
          reason: updatedUser?.error ?? errorType.CREATE_ROOM_FAILED,
        },
      }),
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: messageType.ROOM_CREATED,
      payload: { roomId: updatedUser.roomId, max_users: maxUsers },
    }),
  );
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {import("common-websocket").StartRoomPayload} payload
 * @returns {void}
 */
export function handleStartRoomMessage(ws, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      }),
    );
    return;
  }

  if (
    typeof payload.roomId !== "string" ||
    payload.roomId.trim().length === 0
  ) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
      }),
    );
    return;
  }

  const startedRoom = userStartRoom(ws, payload.roomId);
  if (!startedRoom || "error" in startedRoom) {
    ws.send(
      JSON.stringify({
        type: messageType.ERROR,
        payload: {
          reason: startedRoom?.error ?? errorType.START_ROOM_FAILED,
        },
      }),
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: messageType.ROOM_STARTED,
      payload: {
        roomId: startedRoom.roomId,
        ownerId: startedRoom.ownerId,
      },
    }),
  );
}
