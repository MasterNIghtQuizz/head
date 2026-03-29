import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorType, messageType } from "common-websocket";

vi.mock("../../lib/messaging.js", () => ({
  sendMessageToUser: vi.fn(),
}));

vi.mock("../../handlers/room-membership.handler.js", () => ({
  userCreateRoom: vi.fn(),
  userJoinRoom: vi.fn(),
  userStartRoom: vi.fn(),
}));

import {
  parseClientMessage,
  handleDirectChatMessage,
  handleJoinRoomMessage,
  handleCreateRoomMessage,
  handleStartRoomMessage,
} from "../../handlers/incoming-message.handler.js";
import { sendMessageToUser } from "../../lib/messaging.js";
import {
  userCreateRoom,
  userJoinRoom,
  userStartRoom,
} from "../../handlers/room-membership.handler.js";

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
            type: messageType.JOIN_ROOM,
            payload: { roomId: "r1" },
          }),
        ),
      );

      expect(result).toEqual({
        type: messageType.JOIN_ROOM,
        payload: { roomId: "r1" },
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

  describe("handleJoinRoomMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleJoinRoomMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_ROOM_ID when roomId is missing", () => {
      const ws = createWsMock();

      handleJoinRoomMessage(asWebSocket(ws), { roomId: "" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
      });
    });

    it("sends explicit join error returned by room handler", () => {
      const ws = createWsMock();
      vi.mocked(userJoinRoom).mockReturnValue({ error: errorType.ROOM_FULL });

      handleJoinRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.ROOM_FULL },
      });
    });

    it("sends JOIN_ROOM_FAILED fallback when room handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userJoinRoom).mockReturnValue(null);

      handleJoinRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.JOIN_ROOM_FAILED },
      });
    });

    it("sends JOINED_ROOM when join succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userJoinRoom).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });

      handleJoinRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.JOINED_ROOM,
        payload: { roomId: "room-1" },
      });
    });
  });

  describe("handleCreateRoomMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleCreateRoomMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_ROOM_ID when roomId is missing", () => {
      const ws = createWsMock();

      handleCreateRoomMessage(asWebSocket(ws), { roomId: " ", max_users: 2 });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
      });
    });

    it("sends MISSING_OR_INVALID_MAX_USERS when max_users is invalid", () => {
      const ws = createWsMock();

      handleCreateRoomMessage(asWebSocket(ws), {
        roomId: "room-1",
        max_users: 0,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_OR_INVALID_MAX_USERS },
      });
    });

    it("sends explicit create error returned by room handler", () => {
      const ws = createWsMock();
      vi.mocked(userCreateRoom).mockReturnValue({
        error: errorType.ROOM_ALREADY_EXISTS,
      });

      handleCreateRoomMessage(asWebSocket(ws), {
        roomId: "room-1",
        max_users: 3,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.ROOM_ALREADY_EXISTS },
      });
    });

    it("sends CREATE_ROOM_FAILED fallback when room handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userCreateRoom).mockReturnValue(null);

      handleCreateRoomMessage(asWebSocket(ws), {
        roomId: "room-1",
        max_users: 3,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.CREATE_ROOM_FAILED },
      });
    });

    it("sends ROOM_CREATED when room creation succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userCreateRoom).mockReturnValue({
        userId: "u1",
        userName: "alice",
        roomId: "room-1",
      });

      handleCreateRoomMessage(asWebSocket(ws), {
        roomId: "room-1",
        max_users: 4,
      });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ROOM_CREATED,
        payload: { roomId: "room-1", max_users: 4 },
      });
    });
  });

  describe("handleStartRoomMessage", () => {
    it("sends INVALID_PAYLOAD when payload is invalid", () => {
      const ws = createWsMock();

      handleStartRoomMessage(asWebSocket(ws), /** @type {any} */ (null));

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.INVALID_PAYLOAD },
      });
    });

    it("sends MISSING_ROOM_ID when roomId is missing", () => {
      const ws = createWsMock();

      handleStartRoomMessage(asWebSocket(ws), { roomId: "" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.MISSING_ROOM_ID },
      });
    });

    it("sends explicit start error returned by room handler", () => {
      const ws = createWsMock();
      vi.mocked(userStartRoom).mockReturnValue({
        error: errorType.NOT_ROOM_OWNER,
      });

      handleStartRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.NOT_ROOM_OWNER },
      });
    });

    it("sends START_ROOM_FAILED fallback when room handler returns null", () => {
      const ws = createWsMock();
      vi.mocked(userStartRoom).mockReturnValue(null);

      handleStartRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ERROR,
        payload: { reason: errorType.START_ROOM_FAILED },
      });
    });

    it("sends ROOM_STARTED when room start succeeds", () => {
      const ws = createWsMock();
      vi.mocked(userStartRoom).mockReturnValue({
        roomId: "room-1",
        ownerId: "u1",
      });

      handleStartRoomMessage(asWebSocket(ws), { roomId: "room-1" });

      expect(lastSentMessage(ws)).toEqual({
        type: messageType.ROOM_STARTED,
        payload: { roomId: "room-1", ownerId: "u1" },
      });
    });
  });
});
