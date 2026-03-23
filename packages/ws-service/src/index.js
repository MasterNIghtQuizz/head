import { WebSocketServer } from "ws";
import { userConnect, userDisconnect } from "./handlers/presence.handler.js";
import { userJoinRoom } from "./handlers/room.handler.js";
import { sendMessageToUser } from "./lib/messaging.js";
import { messageType } from "./lib/types/message-type.js";

const wss = new WebSocketServer({ port: 3000 });

wss.on(
  "connection",
  (
    ws,
    req,
  ) /** @param {import("ws").WebSocket} ws  @param {import("http").IncomingMessage} req */ => {
    const connectedUser = userConnect(ws, req);
    if (!connectedUser) {
      return;
    }

    ws.on("message", (rawMessage) => {
      const parsedMessage = parseClientMessage(rawMessage);
      if (!parsedMessage) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { reason: "invalid_json" },
          }),
        );
        return;
      }

      switch (parsedMessage.type) {
        case messageType.JOIN_ROOM:
          handleJoinRoomMessage(ws, connectedUser, parsedMessage.payload);
          break;
        case messageType.CHAT_MESSAGE:
          handleDirectChatMessage(
            ws,
            connectedUser.userId,
            parsedMessage.payload,
          );
          break;
        default:
          ws.send(
            JSON.stringify({
              type: "error",
              payload: {
                reason: "unsupported_message_type",
                value: parsedMessage.type,
              },
            }),
          );
      }
    });

    ws.on(
      "close",
      (code, reason) /** @param {number} code @param {Buffer} reason */ => {
        userDisconnect(ws, connectedUser.userId, connectedUser.userName);
        process.stdout.write(
          `Client disconnected with code ${code} and reason: ${reason.toString()}`,
        );
      },
    );
  },
);

/**
 * @param {import("ws").RawData} rawMessage
 * @returns {{ type: string, payload: any } | null}
 */
function parseClientMessage(rawMessage) {
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
 * @param {any} payload
 * @returns {void}
 */
function handleDirectChatMessage(ws, senderId, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { reason: "invalid_payload" },
      }),
    );
    return;
  }

  const receiverId = payload.receiverId;
  if (typeof receiverId !== "string" || receiverId.length === 0) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { reason: "missing_receiver_id" },
      }),
    );
    return;
  }

  const delivered = sendMessageToUser(senderId, payload, receiverId);
  ws.send(
    JSON.stringify({
      type: delivered ? "message_delivered" : "message_not_delivered",
      payload: { receiverId },
    }),
  );
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {{ userId: string, userName: string, roomId: string | null }} connectedUser
 * @param {any} payload
 * @returns {void}
 */
function handleJoinRoomMessage(ws, connectedUser, payload) {
  if (!payload || typeof payload !== "object") {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { reason: "invalid_payload" },
      }),
    );
    return;
  }

  const roomId = payload.roomId;
  if (typeof roomId !== "string" || roomId.length === 0) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { reason: "missing_room_id" },
      }),
    );
    return;
  }

  const updatedUser = userJoinRoom(ws, roomId);
  if (!updatedUser) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { reason: "join_room_failed" },
      }),
    );
    return;
  }

  connectedUser.roomId = updatedUser.roomId;
  ws.send(
    JSON.stringify({
      type: "joined_room",
      payload: { roomId: updatedUser.roomId },
    }),
  );
}

process.stdout.write("WebSocket server lance sur ws://localhost:3000\n");
