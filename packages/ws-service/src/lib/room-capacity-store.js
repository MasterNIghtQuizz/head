import { roomState } from "common-websocket";

const roomMetadata = new Map();

/**
 * @param {string} roomId
 * @returns {number | null}
 */
function getRoomCapacity(roomId) {
  return roomMetadata.get(roomId)?.maxUsers ?? null;
}

/**
 * @param {string} roomId
 * @param {number} maxUsers
 * @param {boolean} [started=false]
 * @param {string | null} [ownerId=null]
 * @returns {void}
 */
function setRoomCapacity(roomId, maxUsers, started = false, ownerId = null) {
  roomMetadata.set(roomId, { maxUsers, started, ownerId });
}

/**
 * @param {string} roomId
 * @returns {string | null}
 */
function getRoomOwnerId(roomId) {
  return roomMetadata.get(roomId)?.ownerId ?? null;
}

/**
 * @param {string} roomId
 * @param {string} ownerId
 * @returns {boolean}
 */
function setRoomOwnerId(roomId, ownerId) {
  const metadata = roomMetadata.get(roomId);
  if (!metadata) {
    return false;
  }

  roomMetadata.set(roomId, {
    ...metadata,
    ownerId,
  });
  return true;
}

/**
 * @param {string} roomId
 * @returns {boolean}
 */
function isRoomStarted(roomId) {
  return roomMetadata.get(roomId)?.started === true;
}

/**
 * @param {string} roomId
 * @param {boolean} started
 * @returns {boolean}
 */
function setRoomStarted(roomId, started) {
  const metadata = roomMetadata.get(roomId);
  if (!metadata) {
    return false;
  }

  roomMetadata.set(roomId, {
    ...metadata,
    started,
  });
  return true;
}

/**
 * @param {string} roomId
 * @param {number} userCount
 * @returns {import("common-websocket").RoomState | null}
 */
function getRoomState(roomId, userCount) {
  const metadata = roomMetadata.get(roomId);
  if (!metadata) {
    return null;
  }

  if (metadata.started) {
    return roomState.STARTED;
  }

  if (userCount >= metadata.maxUsers) {
    return roomState.FULL;
  }

  return roomState.NOT_FULL;
}

/**
 * @param {string} roomId
 * @returns {void}
 */
function deleteRoomCapacity(roomId) {
  roomMetadata.delete(roomId);
}

export {
  deleteRoomCapacity,
  getRoomCapacity,
  getRoomOwnerId,
  getRoomState,
  isRoomStarted,
  setRoomCapacity,
  setRoomOwnerId,
  setRoomStarted,
};
