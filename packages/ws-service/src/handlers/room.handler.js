import { getSocketContext, setSocketRoom } from "../lib/connection-registry.js";
import { broadcastToRoom } from "../lib/messaging.js";
import { messageType } from "../lib/types/message-type.js";

/**
 * Joins a user socket to a room.
 * If the user was already in another room, this function emits a USER_OFFLINE
 * event in the previous room before moving the user.
 * Then it emits a USER_ONLINE event in the target room.
 *
 * @param {import("ws").WebSocket} ws
 * @param {string} roomId
 * @returns {{ userId: string, userName: string, roomId: string } | null}
 */
function userJoinRoom(ws, roomId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.roomId && context.roomId !== roomId) {
    broadcastToRoom(
      context.roomId,
      {
        type: messageType.USER_OFFLINE,
        payload: { userId: context.userId, userName: context.userName },
      },
      context.userId,
    );
  }

  const updatedContext = setSocketRoom(ws, roomId);
  if (!updatedContext) {
    return null;
  }

  broadcastToRoom(
    roomId,
    {
      type: messageType.USER_ONLINE,
      payload: {
        userId: updatedContext.userId,
        userName: updatedContext.userName,
      },
    },
    updatedContext.userId,
  );

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    roomId,
  };
}

/**
 * Leaves the current room for a user socket.
 * Emits USER_OFFLINE in the room being left and clears the roomId on the
 * socket context.
 *
 * @param {import("ws").WebSocket} ws
 * @returns {{ userId: string, userName: string, roomId: null, leftRoomId: string } | null}
 */
function userLeaveRoom(ws) {
  const context = getSocketContext(ws);
  if (!context || !context.roomId) {
    return null;
  }

  const leftRoomId = context.roomId;
  const updatedContext = setSocketRoom(ws, null);
  if (!updatedContext) {
    return null;
  }

  broadcastToRoom(
    leftRoomId,
    {
      type: messageType.USER_OFFLINE,
      payload: {
        userId: updatedContext.userId,
        userName: updatedContext.userName,
      },
    },
    updatedContext.userId,
  );

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    roomId: null,
    leftRoomId,
  };
}

export { userJoinRoom, userLeaveRoom };
