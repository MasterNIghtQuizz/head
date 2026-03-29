import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errorType, messageType, roomState } from "common-websocket";

vi.mock("../../lib/connection-store.js", () => ({
  getRoomSockets: vi.fn(),
  getSocketContext: vi.fn(),
  setSocketRoom: vi.fn(),
}));

vi.mock("../../lib/messaging.js", () => ({
  broadcastToRoom: vi.fn(),
}));

vi.mock("../../lib/room-capacity-store.js", () => ({
  deleteRoomCapacity: vi.fn(),
  getRoomCapacity: vi.fn(),
  getRoomOwnerId: vi.fn(),
  getRoomState: vi.fn(),
  setRoomCapacity: vi.fn(),
  setRoomOwnerId: vi.fn(),
  setRoomStarted: vi.fn(),
}));

import {
  handleRoomDeparture,
  userCreateRoom,
  userJoinRoom,
  userLeaveRoom,
  userStartRoom,
} from "../../handlers/room-membership.handler.js";
import {
  getRoomSockets,
  getSocketContext,
  setSocketRoom,
} from "../../lib/connection-store.js";
import { broadcastToRoom } from "../../lib/messaging.js";
import {
  deleteRoomCapacity,
  getRoomCapacity,
  getRoomOwnerId,
  getRoomState,
  setRoomCapacity,
  setRoomOwnerId,
  setRoomStarted,
} from "../../lib/room-capacity-store.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

describe("room-membership.handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("userJoinRoom", () => {
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userJoinRoom(ws, "room-1");

      expect(result).toBeNull();
    });

    it("returns current context when already in target room", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });

      const result = userJoinRoom(ws, "room-1");

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      expect(getRoomCapacity).not.toHaveBeenCalled();
    });

    it("returns ROOM_NOT_FOUND when room capacity is missing", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(null);

      const result = userJoinRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_NOT_FOUND });
    });

    it("returns ROOM_STARTED when room is started", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(4);
      vi.mocked(getRoomSockets).mockReturnValue(new Set());
      vi.mocked(getRoomState).mockReturnValue(roomState.STARTED);

      const result = userJoinRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_STARTED });
    });

    it("returns ROOM_FULL when room is full", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(1);
      vi.mocked(getRoomSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getRoomState).mockReturnValue(roomState.FULL);

      const result = userJoinRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_FULL });
    });

    it("returns null when socket room update fails", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(4);
      vi.mocked(getRoomSockets).mockReturnValue(new Set());
      vi.mocked(getRoomState).mockReturnValue(roomState.NOT_FULL);
      vi.mocked(setSocketRoom).mockReturnValue(null);

      const result = userJoinRoom(ws, "room-1");

      expect(result).toBeNull();
    });

    it("broadcasts USER_ONLINE and returns updated context when join succeeds", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(4);
      vi.mocked(getRoomSockets).mockReturnValue(new Set());
      vi.mocked(getRoomState).mockReturnValue(roomState.NOT_FULL);
      vi.mocked(setSocketRoom).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });

      const result = userJoinRoom(ws, "room-1");

      expect(broadcastToRoom).toHaveBeenCalledWith(
        "room-1",
        {
          type: messageType.USER_ONLINE,
          payload: { userId: "u1", userName: "alice" },
        },
        "u1",
      );
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
    });
  });

  describe("userCreateRoom", () => {
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userCreateRoom(ws, "room-1", 4);

      expect(result).toBeNull();
    });

    it("returns ROOM_ALREADY_EXISTS when room already exists", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity).mockReturnValue(8);

      const result = userCreateRoom(ws, "room-1", 4);

      expect(result).toEqual({ error: errorType.ROOM_ALREADY_EXISTS });
      expect(setRoomCapacity).not.toHaveBeenCalled();
    });

    it("returns ROOM_ALREADY_EXISTS when user is already in same room", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(getRoomCapacity).mockReturnValue(null);

      const result = userCreateRoom(ws, "room-1", 4);

      expect(result).toEqual({ error: errorType.ROOM_ALREADY_EXISTS });
      expect(setRoomCapacity).not.toHaveBeenCalled();
    });

    it("creates room and joins it successfully", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomCapacity)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(4);
      vi.mocked(getRoomSockets).mockReturnValue(new Set());
      vi.mocked(getRoomState).mockReturnValue(roomState.NOT_FULL);
      vi.mocked(setSocketRoom).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });

      const result = userCreateRoom(ws, "room-1", 4);

      expect(setRoomCapacity).toHaveBeenCalledWith("room-1", 4, false, "u1");
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
    });
  });

  describe("userStartRoom", () => {
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userStartRoom(ws, "room-1");

      expect(result).toBeNull();
    });

    it("returns ROOM_NOT_FOUND when socket is not in room", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-2",
      });

      const result = userStartRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_NOT_FOUND });
    });

    it("returns ROOM_NOT_FOUND when owner cannot be resolved", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(getRoomOwnerId).mockReturnValue(null);

      const result = userStartRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_NOT_FOUND });
    });

    it("returns NOT_ROOM_OWNER when requester is not owner", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(getRoomOwnerId).mockReturnValue("u2");

      const result = userStartRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.NOT_ROOM_OWNER });
    });

    it("returns ROOM_ALREADY_STARTED when room state is started", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(getRoomOwnerId).mockReturnValue("u1");
      vi.mocked(getRoomSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getRoomState).mockReturnValue(roomState.STARTED);

      const result = userStartRoom(ws, "room-1");

      expect(result).toEqual({ error: errorType.ROOM_ALREADY_STARTED });
      expect(setRoomStarted).not.toHaveBeenCalled();
    });

    it("starts room and broadcasts ROOM_STARTED", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(getRoomOwnerId).mockReturnValue("u1");
      vi.mocked(getRoomSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getRoomState).mockReturnValue(roomState.NOT_FULL);

      const result = userStartRoom(ws, "room-1");

      expect(setRoomStarted).toHaveBeenCalledWith("room-1", true);
      expect(broadcastToRoom).toHaveBeenCalledWith(
        "room-1",
        {
          type: messageType.ROOM_STARTED,
          payload: { roomId: "room-1", ownerId: "u1" },
        },
        null,
      );
      expect(result).toEqual({ roomId: "room-1", ownerId: "u1" });
    });
  });

  describe("handleRoomDeparture", () => {
    it("deletes room capacity when room becomes empty", () => {
      vi.mocked(getRoomSockets).mockReturnValue(new Set());

      handleRoomDeparture("room-1", "u1");

      expect(deleteRoomCapacity).toHaveBeenCalledWith("room-1");
      expect(setRoomOwnerId).not.toHaveBeenCalled();
    });

    it("does nothing when leaving user is not room owner", () => {
      const socket = asWebSocket({});
      vi.mocked(getRoomSockets).mockReturnValue(new Set([socket]));
      vi.mocked(getRoomOwnerId).mockReturnValue("u2");

      handleRoomDeparture("room-1", "u1");

      expect(setRoomOwnerId).not.toHaveBeenCalled();
      expect(broadcastToRoom).not.toHaveBeenCalled();
      expect(deleteRoomCapacity).not.toHaveBeenCalled();
    });

    it("reassigns owner and broadcasts ROOM_OWNER_CHANGED", () => {
      const socketA = asWebSocket({ id: "a" });
      const socketB = asWebSocket({ id: "b" });
      vi.mocked(getRoomSockets).mockReturnValue(new Set([socketA, socketB]));
      vi.mocked(getRoomOwnerId).mockReturnValue("u1");
      vi.mocked(getSocketContext)
        .mockReturnValueOnce({
          userId: "u2",
          userName: "bob",
          roomId: "room-1",
        })
        .mockReturnValueOnce({
          userId: "u3",
          userName: "charlie",
          roomId: "room-1",
        });
      vi.spyOn(Math, "random").mockReturnValue(0);

      handleRoomDeparture("room-1", "u1");

      expect(setRoomOwnerId).toHaveBeenCalledWith("room-1", "u2");
      expect(broadcastToRoom).toHaveBeenCalledWith(
        "room-1",
        {
          type: messageType.ROOM_OWNER_CHANGED,
          payload: { roomId: "room-1", ownerId: "u2" },
        },
        null,
      );
      expect(deleteRoomCapacity).not.toHaveBeenCalled();
    });

    it("deletes room capacity when no replacement owner can be found", () => {
      const socketA = asWebSocket({ id: "a" });
      vi.mocked(getRoomSockets).mockReturnValue(new Set([socketA]));
      vi.mocked(getRoomOwnerId).mockReturnValue("u1");
      vi.mocked(getSocketContext).mockReturnValue(null);
      vi.spyOn(Math, "random").mockReturnValue(0);

      handleRoomDeparture("room-1", "u1");

      expect(deleteRoomCapacity).toHaveBeenCalledWith("room-1");
      expect(setRoomOwnerId).not.toHaveBeenCalled();
      expect(broadcastToRoom).not.toHaveBeenCalled();
    });
  });

  describe("userLeaveRoom", () => {
    it("returns null when user is not in a room", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });

      const result = userLeaveRoom(ws);

      expect(result).toBeNull();
    });

    it("returns null when room update fails", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(setSocketRoom).mockReturnValue(null);

      const result = userLeaveRoom(ws);

      expect(result).toBeNull();
    });

    it("broadcasts offline and deletes room when last user leaves", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(setSocketRoom).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      vi.mocked(getRoomSockets).mockReturnValue(new Set());

      const result = userLeaveRoom(ws);

      expect(broadcastToRoom).toHaveBeenCalledWith(
        "room-1",
        {
          type: messageType.USER_OFFLINE,
          payload: { userId: "u1", userName: "alice" },
        },
        "u1",
      );
      expect(deleteRoomCapacity).toHaveBeenCalledWith("room-1");
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        roomId: null,
        leftRoomId: "room-1",
      });
    });
  });
});
