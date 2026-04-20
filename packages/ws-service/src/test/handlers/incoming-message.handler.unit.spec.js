import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorType, messageType } from "common-websocket";

vi.mock("../../lib/messaging.js", () => ({
  sendMessageToUser: vi.fn(),
}));

vi.mock("../../handlers/session-membership.handler.js", () => ({
  userCreateSession: vi.fn(),
  userJoinSession: vi.fn(),
  userStartSession: vi.fn(),
}));

import {
  parseClientMessage,
  handleDirectChatMessage,
  handleJoinSessionMessage,
  handleCreateSessionMessage,
  handleStartSessionMessage,
} from "../../handlers/incoming-message.handler.js";
import { sendMessageToUser } from "../../lib/messaging.js";
import {
  userCreateSession,
  userJoinSession,
  userStartSession,
} from "../../handlers/session-membership.handler.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

function createWsMock() {
  return {
    send: vi.fn(),
  };
}

/**
 * @param {{ send: import("vitest").Mock }} ws
 */
function lastSentMessage(ws) {
  const lastCall = ws.send.mock.calls.at(-1);
  return JSON.parse(lastCall?.[0]);
}

describe("incoming-message.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseClientMessage", () => {
    it("parses a valid client message", () => {
      const result = parseClientMessage(
        Buffer.from(
          JSON.stringify({
            type: messageType.JOIN_SESSION,
            payload: { sessionId: "r1" },
          }),
        ),
      );

      expect(result).toEqual({
        type: messageType.JOIN_SESSION,
        payload: { sessionId: "r1" },
      });
    });

    it("returns null when json is invalid", () => {
      expect(parseClientMessage(Buffer.from("{invalid-json"))).toBeNull();
    });

    it("returns null when message has no string type", () => {
      expect(
        parseClientMessage(Buffer.from(JSON.stringify({ payload: {} }))),
      ).toBeNull();
      expect(
        parseClientMessage(Buffer.from(JSON.stringify({ type: 123 }))),
      ).toBeNull();
    });
  });

  describe("handleDirectChatMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleDirectChatMessage(
        asWebSocket(ws),
        "sender-1",
        /** @type {any} */ (null),
      );

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
      expect(sendMessageToUser).not.toHaveBeenCalled();
    });

    it("sends MISSING_RECEIVER_ID when receiverId is missing", () => {
      const ws = createWsMock();

      handleDirectChatMessage(asWebSocket(ws), "sender-1", {
        receiverId: "",
        content: "hello",
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_RECEIVER_ID },
      });
      expect(sendMessageToUser).not.toHaveBeenCalled();
    });

    it("sends MESSAGE_DELIVERED when message delivery succeeds", () => {
      const ws = createWsMock();
      vi.mocked(sendMessageToUser).mockReturnValue(true);

      handleDirectChatMessage(asWebSocket(ws), "sender-1", {
        receiverId: "receiver-1",
        content: "hello",
      });

      expect(sendMessageToUser).toHaveBeenCalledWith(
        "sender-1",
        { receiverId: "receiver-1", content: "hello" },
        "receiver-1",
      );
      expect(lastSentMessage(ws)).toEqual({
        type: messageType.MESSAGE_DELIVERED,
        payload: { receiverId: "receiver-1" },
      });
    });

    it("sends MESSAGE_NOT_DELIVERED when message delivery fails", () => {
      const ws = createWsMock();
      vi.mocked(sendMessageToUser).mockReturnValue(false);

      handleDirectChatMessage(asWebSocket(ws), "sender-1", {
        receiverId: "receiver-1",
        content: "hello",
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.MESSAGE_NOT_DELIVERED,
        payload: { receiverId: "receiver-1" },
      });
    });
  });

  describe("handleJoinSessionMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleJoinSessionMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_SESSION_ID when sessionId is missing", () => {
      const ws = createWsMock();

      handleJoinSessionMessage(asWebSocket(ws), { sessionId: "" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      });
    });

    it("sends explicit join error returned by session handler", () => {
      const ws = createWsMock();
      vi.mocked(userJoinSession).mockReturnValue({ error: errorType.SESSION_FULL });

      handleJoinSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.SESSION_FULL },
      });
    });

    it("sends JOIN_SESSION_FAILED fallback when session handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userJoinSession).mockReturnValue(null);

      handleJoinSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.JOIN_SESSION_FAILED },
      });
    });

    it("sends JOINED_SESSION when join succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userJoinSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });

      handleJoinSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.JOINED_SESSION,
        payload: { sessionId: "session-1" },
      });
    });
  });

  describe("handleCreateSessionMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleCreateSessionMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_SESSION_ID when sessionId is missing", () => {
      const ws = createWsMock();

      handleCreateSessionMessage(asWebSocket(ws), { sessionId: " ", max_users: 2 });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      });
    });

    it("sends MISSING_OR_INVALID_MAX_USERS when max_users is invalid", () => {
      const ws = createWsMock();

      handleCreateSessionMessage(asWebSocket(ws), {
        sessionId: "session-1",
        max_users: 0,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_OR_INVALID_MAX_USERS },
      });
    });

    it("sends explicit create error returned by session handler", () => {
      const ws = createWsMock();
      vi.mocked(userCreateSession).mockReturnValue({
        error: errorType.SESSION_ALREADY_EXISTS,
      });

      handleCreateSessionMessage(asWebSocket(ws), {
        sessionId: "session-1",
        max_users: 3,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.SESSION_ALREADY_EXISTS },
      });
    });

    it("sends CREATE_SESSION_FAILED fallback when session handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userCreateSession).mockReturnValue(null);

      handleCreateSessionMessage(asWebSocket(ws), {
        sessionId: "session-1",
        max_users: 3,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.CREATE_SESSION_FAILED },
      });
    });

    it("sends SESSION_CREATED when session creation succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userCreateSession).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
      });

      handleCreateSessionMessage(asWebSocket(ws), {
        sessionId: "session-1",
        max_users: 4,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.SESSION_CREATED,
        payload: { sessionId: "session-1", max_users: 4 },
      });
    });
  });

  describe("handleStartSessionMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleStartSessionMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_SESSION_ID when sessionId is missing", () => {
      const ws = createWsMock();

      handleStartSessionMessage(asWebSocket(ws), { sessionId: "" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_SESSION_ID },
      });
    });

    it("sends explicit start error returned by session handler", () => {
      const ws = createWsMock();
      vi.mocked(userStartSession).mockReturnValue({
        error: errorType.NOT_SESSION_OWNER,
      });

      handleStartSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.NOT_SESSION_OWNER },
      });
    });

    it("sends START_SESSION_FAILED fallback when session handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userStartSession).mockReturnValue(null);

      handleStartSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.START_SESSION_FAILED },
      });
    });

    it("sends SESSION_STARTED when session start succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userStartSession).mockReturnValue({
        sessionId: "session-1",
        ownerId: "u1",
      });

      handleStartSessionMessage(asWebSocket(ws), { sessionId: "session-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.SESSION_STARTED,
        payload: { sessionId: "session-1", ownerId: "u1" },
      });
    });
  });
});
