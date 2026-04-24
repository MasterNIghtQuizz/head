import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/connection-store.js", () => ({
  add: vi.fn(),
  remove: vi.fn(),
  get: vi.fn(),
  setSocketContext: vi.fn(),
  getSocketContext: vi.fn(),
  deleteSocketContext: vi.fn(),
  setSocketSession: vi.fn(),
  findNicknameFallback: vi.fn(),
}));

vi.mock("../../handlers/session-membership.handler.js", () => ({
  handleSessionDeparture: vi.fn(),
}));

vi.mock("../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

import {
  userConnect,
  userDisconnect,
} from "../../../src/handlers/connection.handler.js";
import {
  setSocketContext,
  getSocketContext,
  findNicknameFallback,
} from "../../../src/lib/connection-store.js";
import { handleSessionDeparture } from "../../../src/handlers/session-membership.handler.js";
import { broadcastToSession } from "../../../src/lib/messaging.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

/**
 * @param {any} req
 * @returns {import("http").IncomingMessage}
 */
function asIncomingMessage(req) {
  return req;
}

describe("connection.handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("userConnect", () => {
    it("successfully connects a user with token and session", () => {
      const ws = { close: vi.fn() };
      const req = {
        url: "ws://localhost?sessionId=session-1&userName=alice",
        headers: {
          host: "localhost",
          "x-user-id": "u1",
          "x-user-role": "user",
        },
      };

      vi.mocked(setSocketContext).mockReturnValue(undefined);

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
      expect(setSocketContext).toHaveBeenCalledWith(ws, {
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
    });

    it("defaults userName to anonymous when not provided", () => {
      const ws = { close: vi.fn() };
      const req = {
        url: "ws://localhost",
        headers: {
          host: "localhost",
          "x-user-id": "u1",
        },
      };

      vi.mocked(findNicknameFallback).mockReturnValue(null);
      vi.mocked(setSocketContext).mockReturnValue(undefined);

      const result = userConnect(asWebSocket(ws), asIncomingMessage(req));

      expect(result).not.toBeNull();
      expect(result?.userName).toBe("anonymous");
      expect(findNicknameFallback).toHaveBeenCalledWith("u1");
    });
  });

  describe("userDisconnect", () => {
    it("broadcasts offline and handles session departure when user leaves session", () => {
      const ws = { close: vi.fn() };
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });

      userDisconnect(asWebSocket(ws), "u1", "alice");

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: "user_offline",
          payload: { participant_id: "u1" },
        },
        "u1",
      );
      expect(handleSessionDeparture).toHaveBeenCalledWith("session-1", "u1");
    });

    it("does nothing if user has no session", () => {
      const ws = { close: vi.fn() };
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: "user",
      });

      userDisconnect(asWebSocket(ws), "u1", "alice");

      expect(broadcastToSession).not.toHaveBeenCalled();
      expect(handleSessionDeparture).not.toHaveBeenCalled();
    });
  });
});
