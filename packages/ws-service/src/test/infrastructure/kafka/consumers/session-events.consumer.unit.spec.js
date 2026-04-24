import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionEventTypes, Topics } from "common-contracts";
import { messageType } from "common-websocket";

vi.mock("../../../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock("../../../../lib/connection-store.js", () => ({
  getSessionSockets: vi.fn(() => new Set()),
  getSocketContext: vi.fn(),
  get: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  initSessionParticipants: vi.fn(),
  deleteParticipants: vi.fn(),
  getParticipants: vi.fn(() => []),
}));

vi.mock("../../../../handlers/session-membership.handler.js", () => ({
  userJoinSession: vi.fn(),
  userLeaveSession: vi.fn(),
}));

vi.mock("../../../../lib/session-capacity-store.js", () => ({
  deleteSessionCapacity: vi.fn(),
  setSessionCapacity: vi.fn(),
}));

vi.mock("../../../../lib/session-timer-store.js", () => ({
  setSessionActivatedAt: vi.fn(),
}));

import { SessionEventsConsumer } from "../../../../infrastructure/kafka/consumers/session-events.consumer.js";
import {
  getSessionSockets,
  getSocketContext,
  get as getSocketByUserId,
  addParticipant,
  removeParticipant,
  initSessionParticipants,
  getParticipants,
} from "../../../../lib/connection-store.js";
import { broadcastToSession } from "../../../../lib/messaging.js";
import {
  userJoinSession,
  userLeaveSession,
} from "../../../../handlers/session-membership.handler.js";
import {
  setSessionCapacity,
  deleteSessionCapacity,
} from "../../../../lib/session-capacity-store.js";
import { setSessionActivatedAt } from "../../../../lib/session-timer-store.js";

/**
 * @typedef {Object} KafkaConsumerMock
 * @property {function(string, function): void} addHandler
 */

describe("SessionEventsConsumer", () => {
  /** @type {Map<string, function>} */
  let handlers = new Map();
  /** @type {KafkaConsumerMock} */
  let kafkaConsumer;

  beforeEach(() => {
    vi.resetAllMocks();
    handlers = new Map();
    kafkaConsumer = {
      /**
       * @param {string} topic
       * @param {function} handler
       */
      addHandler: (topic, handler) => handlers.set(topic, handler),
    };
    new SessionEventsConsumer(/** @type {any} */ (kafkaConsumer)).register();

    // Default mocks
    vi.mocked(getParticipants).mockReturnValue([]);
    vi.mocked(getSessionSockets).mockReturnValue(new Set());
  });

  /**
   * @param {string} topic
   * @param {string} eventType
   * @param {any} payload
   * @param {number} [timestamp]
   * @returns {Promise<void>}
   */
  const triggerEvent = async (
    topic,
    eventType,
    payload,
    timestamp = Date.now(),
  ) => {
    const handler = handlers.get(topic);
    if (!handler) {
      throw new Error(`No handler registered for topic ${topic}`);
    }
    // The handler (registered in onMessage) expects an object with { eventType, payload, timestamp }
    await handler({ eventType, payload, timestamp });
  };

  /**
   * @param {unknown} ws
   * @returns {import("ws").WebSocket}
   */
  function asWebSocket(ws) {
    return /** @type {import("ws").WebSocket} */ (ws);
  }

  describe("Lifecycle & Registration", () => {
    it("registers handlers for USER_EVENTS and QUIZZ_EVENTS", () => {
      expect(handlers.has(Topics.USER_EVENTS)).toBe(true);
      expect(handlers.has(Topics.QUIZZ_EVENTS)).toBe(true);
    });
  });

  describe("Quizz Events (Topics.QUIZZ_EVENTS)", () => {
    it("handles SESSION_STARTED and broadcasts it", async () => {
      const timestamp = 123456789;
      await triggerEvent(
        Topics.QUIZZ_EVENTS,
        SessionEventTypes.SESSION_STARTED,
        {
          session_id: "session-1",
          owner_id: "u1",
        },
        timestamp,
      );

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.SESSION_STARTED,
          payload: { sessionId: "session-1", activated_at: timestamp },
        },
        null,
      );
    });

    it("handles SESSION_NEXT_QUESTION and updates timer store", async () => {
      const timestamp = 999888777;
      await triggerEvent(
        Topics.QUIZZ_EVENTS,
        SessionEventTypes.SESSION_NEXT_QUESTION,
        {
          session_id: "session-1",
          question_id: "q123",
        },
        timestamp,
      );

      expect(setSessionActivatedAt).toHaveBeenCalledWith(
        "session-1",
        timestamp,
      );
      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        {
          type: messageType.SESSION_NEXT_QUESTION,
          payload: {
            sessionId: "session-1",
            question_id: "q123",
            activated_at: timestamp,
          },
        },
        null,
      );
    });

    it("handles SESSION_ENDED and cleans up resources", async () => {
      const mockWs = asWebSocket({ close: vi.fn() });
      vi.mocked(getSessionSockets).mockReturnValue(new Set([mockWs]));
      vi.mocked(getSocketContext).mockReturnValue({
        userId: "u1",
        userName: "alice",
        sessionId: "session-1",
        role: "user",
      });

      await triggerEvent(Topics.QUIZZ_EVENTS, SessionEventTypes.SESSION_ENDED, {
        session_id: "session-1",
      });

      expect(broadcastToSession).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({ type: "session_ended" }),
        null,
      );
      expect(mockWs.close).toHaveBeenCalledWith(4001, "session_ended");
      expect(deleteSessionCapacity).toHaveBeenCalledWith("session-1");
    });

    it("handles SESSION_CREATED and initializes local state", async () => {
      await triggerEvent(
        Topics.QUIZZ_EVENTS,
        SessionEventTypes.SESSION_CREATED,
        {
          session_id: "session-1",
          participant_id: "owner-1",
          nickname: "Host",
        },
      );

      expect(setSessionCapacity).toHaveBeenCalledWith(
        "session-1",
        10,
        false,
        "owner-1",
      );
      expect(initSessionParticipants).toHaveBeenCalledWith("session-1");
      expect(addParticipant).toHaveBeenCalledWith("session-1", {
        participant_id: "owner-1",
        nickname: "Host",
        role: "moderator",
      });
    });
  });

  describe("User Events (Topics.USER_EVENTS)", () => {
    describe("PARTICIPANT_JOINED", () => {
      it("broadcasts USER_ONLINE for remote user", async () => {
        vi.mocked(getSocketByUserId).mockReturnValue(null);

        await triggerEvent(
          Topics.USER_EVENTS,
          SessionEventTypes.PARTICIPANT_JOINED,
          {
            session_id: "session-1",
            participant_id: "remote-1",
            nickname: "Alice",
            role: "user",
          },
        );

        expect(addParticipant).toHaveBeenCalledWith(
          "session-1",
          expect.objectContaining({ participant_id: "remote-1" }),
        );
        expect(broadcastToSession).toHaveBeenCalledWith(
          "session-1",
          {
            type: messageType.USER_ONLINE,
            payload: {
              participant_id: "remote-1",
              nickname: "Alice",
              role: "user",
            },
          },
          null,
        );
      });

      it("delegates to local handler for locally connected user", async () => {
        const mockWs = asWebSocket({ id: "local-ws" });
        vi.mocked(getSocketByUserId).mockReturnValue(mockWs);

        await triggerEvent(
          Topics.USER_EVENTS,
          SessionEventTypes.PARTICIPANT_JOINED,
          {
            session_id: "session-1",
            participant_id: "local-1",
            nickname: "Bob",
          },
        );

        expect(userJoinSession).toHaveBeenCalledWith(mockWs, "session-1");
        expect(broadcastToSession).not.toHaveBeenCalled();
      });
    });

    describe("PARTICIPANT_LEFT", () => {
      it("broadcasts USER_OFFLINE for remote user", async () => {
        vi.mocked(getSocketByUserId).mockReturnValue(null);

        await triggerEvent(
          Topics.USER_EVENTS,
          SessionEventTypes.PARTICIPANT_LEFT,
          {
            session_id: "session-1",
            participant_id: "remote-1",
            nickname: "Alice",
          },
        );

        expect(removeParticipant).toHaveBeenCalledWith("session-1", "remote-1");
        expect(broadcastToSession).toHaveBeenCalledWith(
          "session-1",
          {
            type: messageType.USER_OFFLINE,
            payload: {
              participant_id: "remote-1",
              nickname: "Alice",
              role: undefined,
            },
          },
          null,
        );
      });

      it("delegates to local handler for locally connected user in same session", async () => {
        const mockWs = asWebSocket({ id: "local-ws" });
        vi.mocked(getSocketByUserId).mockReturnValue(mockWs);
        vi.mocked(getSocketContext).mockReturnValue({
          userId: "local-1",
          userName: "Bob",
          sessionId: "session-1",
          role: "user",
        });

        await triggerEvent(
          Topics.USER_EVENTS,
          SessionEventTypes.PARTICIPANT_LEFT,
          {
            session_id: "session-1",
            participant_id: "local-1",
          },
        );

        expect(userLeaveSession).toHaveBeenCalledWith(mockWs);
        expect(broadcastToSession).not.toHaveBeenCalled();
      });
    });
  });

  describe("Edge cases & Error handling", () => {
    it("ignores events with missing sessionId", async () => {
      await triggerEvent(
        Topics.QUIZZ_EVENTS,
        SessionEventTypes.SESSION_NEXT_QUESTION,
        {
          question_id: "q1",
        },
      );
      expect(broadcastToSession).not.toHaveBeenCalled();
    });
  });
});
