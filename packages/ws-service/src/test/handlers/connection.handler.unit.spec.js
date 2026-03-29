import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageType } from "common-websocket";

vi.mock("../../lib/connection-store.js", () => ({
  add: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  setSocketContext: vi.fn(),
  getSocketContext: vi.fn(),
}));

vi.mock("../../lib/messaging.js", () => ({
  broadcastToRoom: vi.fn(),
}));

vi.mock("../../handlers/room-membership.handler.js", () => ({
  handleRoomDeparture: vi.fn(),
}));

vi.mock("../../logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  userConnect,
  userDisconnect,
} from "../../handlers/connection.handler.js";
import {
  add,
  get,
  remove,
  setSocketContext,
  getSocketContext,
} from "../../lib/connection-store.js";
import { broadcastToRoom } from "../../lib/messaging.js";
import { handleRoomDeparture } from "../../handlers/room-membership.handler.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

/**
 * @param {unknown} req
 * @returns {import("http").IncomingMessage}
 */
function asIncomingMessage(req) {
  return /** @type {import("http").IncomingMessage} */ (req);
}

function createWsMock() {
  return {
    close: vi.fn(),
  };
}

describe("connection.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("userConnect", () => {
    it("returns null and closes socket when URL is missing", () => {
      const ws = createWsMock();
      const req = { headers: { host: "localhost:8080" } };

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).toBeNull();
      expect(ws.close).toHaveBeenCalledWith(1002, "URL manquante");
      expect(add).not.toHaveBeenCalled();
      expect(setSocketContext).not.toHaveBeenCalled();
    });

    it("returns null and closes socket when userId is missing", () => {
      const ws = createWsMock();
      const req = {
        url: "/?userName=alice",
        headers: { host: "localhost:8080" },
      };

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).toBeNull();
      expect(ws.close).toHaveBeenCalledWith(1002, "ID utilisateur manquant");
      expect(add).not.toHaveBeenCalled();
      expect(setSocketContext).not.toHaveBeenCalled();
    });

    it("registers socket and context when request is valid", () => {
      const ws = createWsMock();
      const req = {
        url: "/?userId=u1&userName=alice",
        headers: { host: "localhost:8080" },
      };

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).toEqual({ userId: "u1", userName: "alice", roomId: null });
      expect(add).toHaveBeenCalledWith("u1", ws);
      expect(setSocketContext).toHaveBeenCalledWith(ws, {
        userId: "u1",
        userName: "alice",
        roomId: null,
      });
      expect(ws.close).not.toHaveBeenCalled();
    });

    it("defaults userName to anonymous when not provided", () => {
      const ws = createWsMock();
      const req = {
        url: "/?userId=u2",
        headers: { host: "localhost:8080" },
      };

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).toEqual({
        userId: "u2",
        userName: "anonymous",
        roomId: null,
      });
      expect(setSocketContext).toHaveBeenCalledWith(ws, {
        userId: "u2",
        userName: "anonymous",
        roomId: null,
      });
    });
  });

  describe("userDisconnect", () => {
    it("only removes user when socket is not in a room", () => {
      const ws = {};
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: null,
      });

      userDisconnect(asWebSocket(ws), "u1", "alice");

      expect(remove).toHaveBeenCalledWith("u1", ws);
      expect(broadcastToRoom).not.toHaveBeenCalled();
      expect(handleRoomDeparture).not.toHaveBeenCalled();
    });

    it("does not broadcast offline when same user is still connected", () => {
      const ws = {};
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(get).mockReturnValue(asWebSocket({}));

      userDisconnect(asWebSocket(ws), "u1", "alice");

      expect(remove).toHaveBeenCalledWith("u1", ws);
      expect(get).toHaveBeenCalledWith("u1");
      expect(broadcastToRoom).not.toHaveBeenCalled();
      expect(handleRoomDeparture).not.toHaveBeenCalled();
    });

    it("broadcasts offline and handles room departure when user leaves room", () => {
      const ws = {};
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });
      vi.mocked(get).mockReturnValue(null);

      userDisconnect(asWebSocket(ws), "u1", "alice");

      expect(remove).toHaveBeenCalledWith("u1", ws);
      expect(broadcastToRoom).toHaveBeenCalledWith(
        "room-1",
        {
          type: messageType.USER_OFFLINE,
          payload: { userId: "u1", userName: "alice" },
        },
        "u1",
      );
      expect(handleRoomDeparture).toHaveBeenCalledWith("room-1", "u1");
    });
  });
});
