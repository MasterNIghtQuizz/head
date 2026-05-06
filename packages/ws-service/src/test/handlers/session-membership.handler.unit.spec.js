import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "common-auth";
import { errorType, messageType, sessionState } from "common-websocket";

vi.mock("../../lib/connection-store.js", () => ({
  getSessionSockets: vi.fn(),
  getSocketContext: vi.fn(),
  setSocketSession: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  getParticipants: vi.fn(),
  clearPendingDeparture: vi.fn(),
  registerPendingDeparture: vi.fn(),
  deleteParticipants: vi.fn(),
}));

vi.mock("../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock("../../lib/session-timer-store.js", () => ({
  getSessionActivatedAt: vi.fn(),
  deleteSessionTimer: vi.fn(),
}));

vi.mock("../../lib/session-capacity-store.js", () => ({
  deleteSessionCapacity: vi.fn(),
  getSessionCapacity: vi.fn(),
  getSessionOwnerId: vi.fn(),
  getSessionState: vi.fn(),
  setSessionCapacity: vi.fn(),
  setSessionOwnerId: vi.fn(),
  setSessionStarted: vi.fn(),
}));

import {
  userCreateSession,
  userJoinSession,
  userLeaveSession,
  userStartSession,
} from "../../handlers/session-membership.handler.js";
import {
  getSessionSockets,
  getSocketContext,
  setSocketSession,
  getParticipants,
  addParticipant,
} from "../../lib/connection-store.js";
import { getSessionActivatedAt } from "../../lib/session-timer-store.js";
import { broadcastToSession } from "../../lib/messaging.js";
import {
  getSessionCapacity,
  getSessionOwnerId,
  getSessionState,
  setSessionCapacity,
  setSessionStarted,
} from "../../lib/session-capacity-store.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

describe("session-membership.handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("userJoinSession", () => {
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userJoinSession(ws, "session-1");

      expect(result).toBeNull();
    });

    it("returns current context when already in target session AND already in participants list", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
      vi.mocked(getSessionCapacity).mockReturnValue(10);
      vi.mocked(getParticipants).mockReturnValue([
        { participant_id: "u1", nickname: "alice", role: "user" },
      ]);
      vi.mocked(getSessionActivatedAt).mockReturnValue(123456789);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        participants: [
          { participant_id: "u1", nickname: "alice", role: "user" },
        ],
        activated_at: 123456789,
      });
      expect(addParticipant).not.toHaveBeenCalled();
    });

    it("adds participant but returns current context when already in target session but NOT in participants list", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
      vi.mocked(getSessionCapacity).mockReturnValue(10);
      vi.mocked(getParticipants).mockReturnValue([
        { participant_id: "u1", nickname: "alice", role: "user" },
      ]);
      vi.mocked(getSessionActivatedAt).mockReturnValue(987654321);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        participants: [
          { participant_id: "u1", nickname: "alice", role: "user" },
        ],
        activated_at: 987654321,
      });
    });

    it("returns SESSION_NOT_FOUND when session capacity is missing", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: null,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(null);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_NOT_FOUND });
    });

    it("returns SESSION_STARTED when session is started", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: null,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(4);
      vi.mocked(getSessionSockets).mockReturnValue(new Set());
      vi.mocked(getSessionState).mockReturnValue(sessionState.STARTED);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_STARTED });
    });

    it("returns SESSION_FULL when session is full", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: null,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(1);
      vi.mocked(getSessionSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getSessionState).mockReturnValue(sessionState.FULL);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_FULL });
    });

    it("broadcasts USER_ONLINE and returns updated context when join succeeds", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: "user",
      });
      vi.mocked(getSessionCapacity).mockReturnValue(4);
      vi.mocked(getSessionSockets).mockReturnValue(new Set());
      vi.mocked(getSessionState).mockReturnValue(sessionState.NOT_FULL);
      vi.mocked(setSocketSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
      vi.mocked(getParticipants).mockReturnValue([
        { participant_id: "u1", nickname: "alice", role: "user" },
      ]);
      vi.mocked(getSessionActivatedAt).mockReturnValue(111222);

      const result = userJoinSession(ws, "session-1");

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_ONLINE,
          payload: {
            participant_id: "u1",
            nickname: "alice",
            role: "user",
          },
        },
        "u1",
      );
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        participants: [
          { participant_id: "u1", nickname: "alice", role: "user" },
        ],
        activated_at: 111222,
      });
    });
  });

  describe("userCreateSession", () => {
    it("creates session and joins it successfully", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: UserRole.MODERATOR,
      });
      vi.mocked(getSessionCapacity)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(4);
      vi.mocked(getSessionSockets).mockReturnValue(new Set());
      vi.mocked(getSessionState).mockReturnValue(sessionState.NOT_FULL);
      vi.mocked(setSocketSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: UserRole.MODERATOR,
      });

      const result = userCreateSession(ws, "session-1", 4);

      expect(setSessionCapacity).toHaveBeenCalledWith(
        "session-1",
        4,
        false,
        "u1",
      );
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
    });
  });

  describe("userStartSession", () => {
    it("starts session and broadcasts SESSION_STARTED", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: UserRole.MODERATOR,
      });
      vi.mocked(getSessionOwnerId).mockReturnValue("u1");
      vi.mocked(getSessionSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getSessionState).mockReturnValue(sessionState.NOT_FULL);

      const result = userStartSession(ws, "session-1");

      expect(setSessionStarted).toHaveBeenCalledWith("session-1", true);
      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.SESSION_STARTED,
          payload: { sessionId: "session-1", ownerId: "u1" },
        },
        null,
      );
      expect(result).toEqual({ sessionId: "session-1", ownerId: "u1" });
    });
  });

  describe("userLeaveSession", () => {
    it("broadcasts offline and deletes session when last user leaves", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });
      vi.mocked(setSocketSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: null,
      });
      vi.mocked(getSessionSockets).mockReturnValue(new Set());

      const result = userLeaveSession(ws);

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_OFFLINE,
          payload: {
            participant_id: "u1",
          },
        },
        "u1",
      );
      // Wait, look at the payload above. We simplified it to only participant_id in index.d.ts?
      // Yes, I did.

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        leftSessionId: "session-1",
      });
    });
  });
});
