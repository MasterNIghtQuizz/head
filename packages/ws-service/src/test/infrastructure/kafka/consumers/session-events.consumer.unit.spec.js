import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionEventTypes, Topics } from "common-contracts";
import { messageType } from "common-websocket";

vi.mock("../../../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock("../../../../lib/connection-store.js", () => ({
  getSessionSockets: vi.fn(),
  getSocketContext: vi.fn(),
  get: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  initSessionParticipants: vi.fn(),
  deleteParticipants: vi.fn(),
}));

vi.mock("../../../../handlers/session-membership.handler.js", () => ({
  userJoinSession: vi.fn(),
  userLeaveSession: vi.fn(),
}));

vi.mock("../../../../lib/session-capacity-store.js", () => ({
  deleteSessionCapacity: vi.fn(),
}));

import { SessionEventsConsumer } from "../../../../infrastructure/kafka/consumers/session-events.consumer.js";
import {
  getSessionSockets,
  getSocketContext,
  get as getSocketByUserId,
} from "../../../../lib/connection-store.js";
import { broadcastToSession } from "../../../../lib/messaging.js";
import { deleteSessionCapacity } from "../../../../lib/session-capacity-store.js";
import {
  userJoinSession,
  userLeaveSession,
} from "../../../../handlers/session-membership.handler.js";

describe("SessionEventsConsumer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("registers all required session event handlers using Kafka topics", () => {
    const addHandler = vi.fn();
    const kafkaConsumer = /** @type {import('common-kafka').KafkaConsumer} */ (
      /** @type {unknown} */ ({ addHandler })
    );

    new SessionEventsConsumer(kafkaConsumer).register();

    expect(addHandler).toHaveBeenCalledWith(
      Topics.USER_EVENTS,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      Topics.QUIZZ_EVENTS,
      expect.any(Function),
    );
  });

  /**
   * @param {unknown} ws
   * @returns {import("ws").WebSocket}
   */
  function asWebSocket(ws) {
    return /** @type {import("ws").WebSocket} */ (ws);
  }

  it("destroys session and kicks participants on session-ended", async () => {
    const handlers = new Map();
    const kafkaConsumer = /** @type {import('common-kafka').KafkaConsumer} */ (
      /** @type {unknown} */ ({
        addHandler: (topic, handler) => handlers.set(topic, handler),
      })
    );

    const socketA = /** @type {import('ws').WebSocket} */ (
      /** @type {unknown} */ ({ close: vi.fn() })
    );
    const socketB = /** @type {import('ws').WebSocket} */ (
      /** @type {unknown} */ ({ close: vi.fn() })
    );
    vi.mocked(getSessionSockets).mockReturnValue(new Set([socketA, socketB]));
    vi.mocked(getSocketContext)
      .mockReturnValueOnce({ userId: "u1" })
      .mockReturnValueOnce({ userId: "u2" });

    new SessionEventsConsumer(kafkaConsumer).register();

    // The handler is registered for Topics.USER_EVENTS and Topics.QUIZZ_EVENTS
    const handler = handlers.get(Topics.QUIZZ_EVENTS);
    await handler({
      eventType: SessionEventTypes.SESSION_ENDED,
      payload: { session_id: "session-1" },
    });

    expect(broadcastToSession).toHaveBeenCalledWith(
      "session-1",
      {
        type: "session_ended",
        payload: { sessionId: "session-1" },
      },
      null,
    );
    expect(socketA.close).toHaveBeenCalledWith(4001, "session_ended");
    expect(socketB.close).toHaveBeenCalledWith(4001, "session_ended");
    expect(deleteSessionCapacity).toHaveBeenCalledWith("session-1");
  });

  describe("notifyParticipants", () => {
    it("notifies participants when they are NOT connected locally", async () => {
      const handlers = new Map();
      const kafkaConsumer =
        /** @type {import('common-kafka').KafkaConsumer} */ (
          /** @type {unknown} */ ({
            addHandler: (topic, handler) => handlers.set(topic, handler),
          })
        );

      vi.mocked(getSocketByUserId).mockReturnValue(null);

      const consumer = new SessionEventsConsumer(kafkaConsumer);
      consumer.register();

      // PARTICIPANT_JOINED (remote)
      await handlers.get(Topics.USER_EVENTS)({
        eventType: SessionEventTypes.PARTICIPANT_JOINED,
        payload: {
          session_id: "session-1",
          participant_id: "p1",
          nickname: "alice",
          role: "player",
        },
      });

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_ONLINE,
          payload: { userId: "p1", userName: "alice", role: "player" },
        },
        null,
      );
      expect(userJoinSession).not.toHaveBeenCalled();

      // PARTICIPANT_LEFT (remote)
      await handlers.get(Topics.USER_EVENTS)({
        eventType: SessionEventTypes.PARTICIPANT_LEFT,
        payload: {
          session_id: "session-1",
          participant_id: "p2",
          nickname: "bob",
          role: "player",
        },
      });

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_OFFLINE,
          payload: { userId: "p2", userName: "bob", role: "player" },
        },
        null,
      );
      expect(userLeaveSession).not.toHaveBeenCalled();
    });

    it("uses local handlers when participants ARE connected locally", async () => {
      const handlers = new Map();
      const kafkaConsumer =
        /** @type {import('common-kafka').KafkaConsumer} */ (
          /** @type {unknown} */ ({
            addHandler: (topic, handler) => handlers.set(topic, handler),
          })
        );

      const mockSocket = { id: "socket-1" };
      vi.mocked(getSocketByUserId).mockReturnValue(asWebSocket(mockSocket));
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "p1",
        userName: "alice",
        sessionId: "session-1",
      });

      const consumer = new SessionEventsConsumer(kafkaConsumer);
      consumer.register();

      // PARTICIPANT_JOINED (local)
      await handlers.get(Topics.USER_EVENTS)({
        eventType: SessionEventTypes.PARTICIPANT_JOINED,
        payload: {
          session_id: "session-1",
          participant_id: "p1",
          nickname: "alice",
          role: "player",
        },
      });

      expect(userJoinSession).toHaveBeenCalledWith(mockSocket, "session-1");
      expect(broadcastToSession).not.toHaveBeenCalled();

      // PARTICIPANT_LEFT (local)
      await handlers.get(Topics.USER_EVENTS)({
        eventType: SessionEventTypes.PARTICIPANT_LEFT,
        payload: {
          session_id: "session-1",
          participant_id: "p1",
          nickname: "alice",
          role: "player",
        },
      });

      expect(userLeaveSession).toHaveBeenCalledWith(mockSocket);
      expect(broadcastToSession).not.toHaveBeenCalled();
    });

    it("broadcasts instead of using local handler if participant is in a DIFFERENT session locally during leave", async () => {
      const handlers = new Map();
      const kafkaConsumer =
        /** @type {import('common-kafka').KafkaConsumer} */ (
          /** @type {unknown} */ ({
            addHandler: (topic, handler) => handlers.set(topic, handler),
          })
        );

      const mockSocket = { id: "socket-1" };
      vi.mocked(getSocketByUserId).mockReturnValue(asWebSocket(mockSocket));
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "p1",
        userName: "alice",
        sessionId: "other-session", // Locally in a different session
      });

      const consumer = new SessionEventsConsumer(kafkaConsumer);
      consumer.register();

      // PARTICIPANT_LEFT for session-1
      await handlers.get(Topics.USER_EVENTS)({
        eventType: SessionEventTypes.PARTICIPANT_LEFT,
        payload: {
          session_id: "session-1",
          participant_id: "p1",
          nickname: "alice",
          role: "player",
        },
      });

      // Should NOT call userLeaveSession because they are in "other-session"
      expect(userLeaveSession).not.toHaveBeenCalled();
      // Should fall back to direct broadcast to session-1
      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.USER_OFFLINE,
          payload: { userId: "p1", userName: "alice", role: "player" },
        },
        null,
      );
    });
  });
});
