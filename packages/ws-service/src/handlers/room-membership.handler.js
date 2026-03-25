import {
  getRoomSockets,
  getSocketContext,
  setSocketRoom,
} from "../lib/connection-store.js";
import { broadcastToRoom } from "../lib/messaging.js";
import {
  deleteRoomCapacity,
  getRoomCapacity,
  getRoomOwnerId,
  getRoomState,
  setRoomCapacity,
  setRoomOwnerId,
  setRoomStarted,
} from "../lib/room-capacity-store.js";
import { errorType, messageType, roomState } from "common-websocket";

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} roomId
 * @returns {{ userId: string, userName: string, roomId: string } | { error: string } | null}
 */
function userJoinRoom(ws, roomId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.roomId === roomId) {
    return {
      userId: context.userId,
      userName: context.userName,
      roomId,
    };
  }

  const existingCapacity = getRoomCapacity(roomId);
  if (existingCapacity === null) {
    return { error: errorType.ROOM_NOT_FOUND };
  }

  const roomSockets = getRoomSockets(roomId);
  const state = getRoomState(roomId, roomSockets.size);
  if (state === roomState.STARTED) {
    return { error: errorType.ROOM_STARTED };
  }

  if (state === roomState.FULL) {
    return { error: errorType.ROOM_FULL };
  }

  const previousRoomId = context.roomId;
  const updatedContext = setSocketRoom(ws, roomId);
  if (!updatedContext) {
    return null;
  }

  if (previousRoomId && previousRoomId !== roomId) {
    broadcastToRoom(
      previousRoomId,
      {
        type: messageType.USER_OFFLINE,
        payload: { userId: context.userId, userName: context.userName },
      },
      context.userId,
    );
    handleRoomDeparture(previousRoomId, context.userId);
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
 * @param {import("ws").WebSocket} ws
 * @param {string} roomId
 * @param {number} maxUsers
 * @returns {{ userId: string, userName: string, roomId: string } | { error: string } | null}
 */
function userCreateRoom(ws, roomId, maxUsers) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (getRoomCapacity(roomId) !== null) {
    return { error: errorType.ROOM_ALREADY_EXISTS };
  }

  if (context.roomId === roomId) {
    return { error: errorType.ROOM_ALREADY_EXISTS };
  }

  setRoomCapacity(roomId, maxUsers, false, context.userId);
  return userJoinRoom(ws, roomId);
}

/**
 * @param {import("ws").WebSocket} ws
 * @param {string} roomId
 * @returns {{ roomId: string, ownerId: string } | { error: string } | null}
 */
function userStartRoom(ws, roomId) {
  const context = getSocketContext(ws);
  if (!context) {
    return null;
  }

  if (context.roomId !== roomId) {
    return { error: errorType.ROOM_NOT_FOUND };
  }

  const ownerId = getRoomOwnerId(roomId);
  if (!ownerId) {
    return { error: errorType.ROOM_NOT_FOUND };
  }

  if (ownerId !== context.userId) {
    return { error: errorType.NOT_ROOM_OWNER };
  }

  const state = getRoomState(roomId, getRoomSockets(roomId).size);
  if (state === roomState.STARTED) {
    return { error: errorType.ROOM_ALREADY_STARTED };
  }

  setRoomStarted(roomId, true);
  broadcastToRoom(
    roomId,
    {
      type: messageType.ROOM_STARTED,
      payload: { roomId, ownerId },
    },
    null,
  );

  return { roomId, ownerId };
}

/**
 * @param {string} roomId
 * @param {string} leavingUserId
 * @returns {void}
 */
function handleRoomDeparture(roomId, leavingUserId) {
  const sockets = Array.from(getRoomSockets(roomId));
  if (sockets.length === 0) {
    deleteRoomCapacity(roomId);
    return;
  }

  const ownerId = getRoomOwnerId(roomId);
  if (ownerId !== leavingUserId) {
    return;
  }

  const startIndex = Math.floor(Math.random() * sockets.length);
  let newOwnerId = null;
  for (let i = 0; i < sockets.length; i += 1) {
    const socket = sockets[(startIndex + i) % sockets.length];
    const socketContext = getSocketContext(socket);
    if (socketContext?.userId) {
      newOwnerId = socketContext.userId;
      break;
    }
  }

  if (!newOwnerId) {
    deleteRoomCapacity(roomId);
    return;
  }

  setRoomOwnerId(roomId, newOwnerId);
  broadcastToRoom(
    roomId,
    {
      type: messageType.ROOM_OWNER_CHANGED,
      payload: { roomId, ownerId: newOwnerId },
    },
    null,
  );
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

  const socketsLeft = getRoomSockets(leftRoomId).size;
  if (socketsLeft === 0) {
    deleteRoomCapacity(leftRoomId);
  } else {
    handleRoomDeparture(leftRoomId, updatedContext.userId);
  }

  return {
    userId: updatedContext.userId,
    userName: updatedContext.userName,
    roomId: null,
    leftRoomId,
  };
}

export {
  handleRoomDeparture,
  userCreateRoom,
  userJoinRoom,
  userLeaveRoom,
  userStartRoom,
};
