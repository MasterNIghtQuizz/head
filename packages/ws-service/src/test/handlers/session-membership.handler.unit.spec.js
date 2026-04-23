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
}));

vi.mock("../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
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
  handleSessionDeparture,
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
  removeParticipant,
} from "../../lib/connection-store.js";
import { broadcastToSession } from "../../lib/messaging.js";
import {
  deleteSessionCapacity,
  getSessionCapacity,
  getSessionOwnerId,
  getSessionState,
  setSessionCapacity,
  setSessionOwnerId,
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
      vi.mocked(getParticipants).mockReturnValue([{ participant_id: "u1" }]);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      // Should NOT call addParticipant because they are already there
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
      vi.mocked(getParticipants).mockReturnValue([]); // Missing from participants list

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      // Should call addParticipant to sync state
      expect(addParticipant).toHaveBeenCalledWith("session-1", {
        participant_id: "u1",
        nickname: "alice",
        role: "user",
      });
    });

    it("returns SESSION_NOT_FOUND when session capacity is missing", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
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
      });
      vi.mocked(getSessionCapacity).mockReturnValue(1);
      vi.mocked(getSessionSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getSessionState).mockReturnValue(sessionState.FULL);

      const result = userJoinSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_FULL });
    });

    it("returns null when socket session update fails", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(4);
      vi.mocked(getSessionSockets).mockReturnValue(new Set());
      vi.mocked(getSessionState).mockReturnValue(sessionState.NOT_FULL);
      vi.mocked(setSocketSession).mockReturnValue(null);

      const result = userJoinSession(ws, "session-1");

      expect(result).toBeNull();
    });

    it("broadcasts USER_ONLINE and returns updated context when join succeeds", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(4);
      vi.mocked(getSessionSockets).mockReturnValue(new Set());
      vi.mocked(getSessionState).mockReturnValue(sessionState.NOT_FULL);
      vi.mocked(setSocketSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });

      const result = userJoinSession(ws, "session-1");

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_ONLINE,
          payload: { userId: "u1", userName: "alice" },
        },
        "u1",
      );
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
    });
  });

  describe("userCreateSession", () => {
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userCreateSession(ws, "session-1", 4);

      expect(result).toBeNull();
    });

    it("returns SESSION_ALREADY_EXISTS when session already exists", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: UserRole.MODERATOR,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(8);

      const result = userCreateSession(ws, "session-1", 4);

      expect(result).toEqual({ error: errorType.SESSION_ALREADY_EXISTS });
      expect(setSessionCapacity).not.toHaveBeenCalled();
    });

    it("returns SESSION_ALREADY_EXISTS when user is already in same session", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: UserRole.MODERATOR,
      });
      vi.mocked(getSessionCapacity).mockReturnValue(null);

      const result = userCreateSession(ws, "session-1", 4);

      expect(result).toEqual({ error: errorType.SESSION_ALREADY_EXISTS });
      expect(setSessionCapacity).not.toHaveBeenCalled();
    });

    it("returns CREATE_SESSION_FAILED when user is not moderator", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        role: UserRole.USER,
      });

      const result = userCreateSession(ws, "session-1", 4);

      expect(result).toEqual({ error: errorType.CREATE_SESSION_FAILED });
      expect(getSessionCapacity).not.toHaveBeenCalled();
      expect(setSessionCapacity).not.toHaveBeenCalled();
    });

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
    it("returns null when socket context does not exist", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue(null);

      const result = userStartSession(ws, "session-1");

      expect(result).toBeNull();
    });

    it("returns SESSION_NOT_FOUND when socket is not in session", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-2",
      });

      const result = userStartSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_NOT_FOUND });
    });

    it("returns SESSION_NOT_FOUND when owner cannot be resolved", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      vi.mocked(getSessionOwnerId).mockReturnValue(null);

      const result = userStartSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_NOT_FOUND });
    });

    it("returns NOT_SESSION_OWNER when requester is not owner", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      vi.mocked(getSessionOwnerId).mockReturnValue("u2");

      const result = userStartSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.NOT_SESSION_OWNER });
    });

    it("returns SESSION_ALREADY_STARTED when session state is started", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      vi.mocked(getSessionOwnerId).mockReturnValue("u1");
      vi.mocked(getSessionSockets).mockReturnValue(new Set([asWebSocket({})]));
      vi.mocked(getSessionState).mockReturnValue(sessionState.STARTED);

      const result = userStartSession(ws, "session-1");

      expect(result).toEqual({ error: errorType.SESSION_ALREADY_STARTED });
      expect(setSessionStarted).not.toHaveBeenCalled();
    });

    it("starts session and broadcasts SESSION_STARTED", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
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

  describe("handleSessionDeparture", () => {
    it("deletes session capacity when session becomes empty", () => {
      vi.mocked(getSessionSockets).mockReturnValue(new Set());

      handleSessionDeparture("session-1", "u1");

      expect(deleteSessionCapacity).toHaveBeenCalledWith("session-1");
      expect(setSessionOwnerId).not.toHaveBeenCalled();
    });

    it("does nothing when leaving user is not session owner", () => {
      const socket = asWebSocket({});
      vi.mocked(getSessionSockets).mockReturnValue(new Set([socket]));
      vi.mocked(getSessionOwnerId).mockReturnValue("u2");

      handleSessionDeparture("session-1", "u1");

      expect(setSessionOwnerId).not.toHaveBeenCalled();
      expect(broadcastToSession).not.toHaveBeenCalled();
      expect(deleteSessionCapacity).not.toHaveBeenCalled();
    });

    it("reassigns owner and broadcasts SESSION_OWNER_CHANGED", () => {
      const socketA = asWebSocket({ id: "a" });
      const socketB = asWebSocket({ id: "b" });
      vi.mocked(getSessionSockets).mockReturnValue(new Set([socketA, socketB]));
      vi.mocked(getSessionOwnerId).mockReturnValue("u1");
      vi.mocked(getSocketContext)
        .mockReturnValueOnce({
          userId: "u2",
          userName: "bob",
          sessionId: "session-1",
        })
        .mockReturnValueOnce({
          userId: "u3",
          userName: "charlie",
          sessionId: "session-1",
        });
      vi.spyOn(Math, "random").mockReturnValue(0);

      handleSessionDeparture("session-1", "u1");

      expect(setSessionOwnerId).toHaveBeenCalledWith("session-1", "u2");
      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.SESSION_OWNER_CHANGED,
          payload: { sessionId: "session-1", ownerId: "u2" },
        },
        null,
      );
      expect(deleteSessionCapacity).not.toHaveBeenCalled();
    });

    it("deletes session capacity when no replacement owner can be found", () => {
      const socketA = asWebSocket({ id: "a" });
      vi.mocked(getSessionSockets).mockReturnValue(new Set([socketA]));
      vi.mocked(getSessionOwnerId).mockReturnValue("u1");
      vi.mocked(getSocketContext).mockReturnValue(null);
      vi.spyOn(Math, "random").mockReturnValue(0);

      handleSessionDeparture("session-1", "u1");

      expect(deleteSessionCapacity).toHaveBeenCalledWith("session-1");
      expect(setSessionOwnerId).not.toHaveBeenCalled();
      expect(broadcastToSession).not.toHaveBeenCalled();
    });
  });

  describe("userLeaveSession", () => {
    it("returns null when user is not in a session", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
      });

      const result = userLeaveSession(ws);

      expect(result).toBeNull();
    });

    it("returns null when session update fails", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      vi.mocked(setSocketSession).mockReturnValue(null);

      const result = userLeaveSession(ws);

      expect(result).toBeNull();
    });

    it("broadcasts offline and deletes session when last user leaves", () => {
      const ws = asWebSocket({});
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });
      vi.mocked(setSocketSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: null,
      });
      vi.mocked(getSessionSockets).mockReturnValue(new Set());

      const result = userLeaveSession(ws);

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_OFFLINE,
          payload: { userId: "u1", userName: "alice" },
        },
        "u1",
      );
      expect(deleteSessionCapacity).toHaveBeenCalledWith("session-1");
      expect(result).toEqual({
        userId: "u1",
        userName: "alice",
        sessionId: null,
        leftSessionId: "session-1",
      });
    });
  });
});
