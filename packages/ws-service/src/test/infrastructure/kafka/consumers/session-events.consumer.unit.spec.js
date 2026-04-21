import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionEventTypes } from "common-contracts";
import { messageType } from "common-websocket";

vi.mock("../../../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock("../../../../lib/connection-store.js", () => ({
  getSessionSockets: vi.fn(),
  getSocketContext: vi.fn(),
}));

vi.mock("../../../../lib/session-capacity-store.js", () => ({
  deleteSessionCapacity: vi.fn(),
}));

import { SessionEventsConsumer } from "../../../../infrastructure/kafka/consumers/session-events.consumer.js";
import { getSessionSockets, getSocketContext } from "../../../../lib/connection-store.js";
import { broadcastToSession } from "../../../../lib/messaging.js";
import { deleteSessionCapacity } from "../../../../lib/session-capacity-store.js";

describe("SessionEventsConsumer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("registers all required session event handlers", () => {
    const addHandler = vi.fn();
    const kafkaConsumer = /** @type {import('common-kafka').KafkaConsumer} */ (
      /** @type {unknown} */ ({ addHandler })
    );

    new SessionEventsConsumer(kafkaConsumer).register();

    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.SESSION_CREATED,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.SESSION_NEXT_QUESTION,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.SESSION_ENDED,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.SESSION_DELETED,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.PARTICIPANT_JOINED,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.PARTICIPANT_LEFT,
      expect.any(Function),
    );
    expect(addHandler).toHaveBeenCalledWith(
      SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
      expect.any(Function),
    );
  });

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

    const handler = handlers.get(SessionEventTypes.SESSION_ENDED);
    await handler({ session_id: "session-1" });

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

  it("notifies participants on participant join and leave events", async () => {
    const handlers = new Map();
    const kafkaConsumer = /** @type {import('common-kafka').KafkaConsumer} */ (
      /** @type {unknown} */ ({
        addHandler: (topic, handler) => handlers.set(topic, handler),
      })
    );

    new SessionEventsConsumer(kafkaConsumer).register();

    await handlers.get(SessionEventTypes.PARTICIPANT_JOINED)({
      session_id: "session-1",
      participant_id: "p1",
      role: "player",
    });

    expect(broadcastToSession).toHaveBeenCalledWith(
      "session-1",
      {
        type: messageType.USER_ONLINE,
        payload: { participantId: "p1", role: "player" },
      },
      null,
    );

    await handlers.get(SessionEventTypes.PARTICIPANT_LEFT)({
      session_id: "session-1",
      participant_id: "p2",
      role: "player",
    });

    expect(broadcastToSession).toHaveBeenCalledWith(
      "session-1",
      {
        type: messageType.USER_OFFLINE,
        payload: { participantId: "p2", role: "player" },
      },
      null,
    );
  });
});
