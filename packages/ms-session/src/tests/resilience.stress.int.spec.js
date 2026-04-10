// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { call } from "common-axios";
import { ParticipantService } from "../modules/session/services/participant.service.js";

vi.mock("common-axios");
vi.mock("common-auth", () => ({
  TokenService: {
    signInternalToken: vi.fn().mockReturnValue("mock-token"),
  },
  TokenType: { INTERNAL: "internal" },
  UserRole: { ADMIN: "admin" },
}));

describe("MS Session Resilience Stress Test", () => {
  let kafka;
  let sessionRepository;
  let participantRepository;
  let sessionService;

  beforeAll(async () => {
    sessionRepository = {
      find: vi.fn(),
    };
    participantRepository = {
      create: vi.fn(),
      find: vi.fn(),
      delete: vi.fn(),
    };
    kafka = {
      disconnect: vi.fn(),
      publish: vi.fn(),
    };
    sessionService = {
      deleteSession: vi.fn(),
    };
  });

  afterAll(async () => {
    await kafka?.disconnect();
  });

  it("should handle parallel submissions gracefully when Valkey fails", async () => {
    const valkeyMock = {
      get: vi.fn().mockRejectedValue(new Error("Redis connection lost")),
      set: vi.fn().mockRejectedValue(new Error("Redis connection lost")),
    };

    vi.mocked(call).mockImplementation(async (cfg) => {
      if (cfg.url.includes("/choices/ids")) {
        return ["c1"];
      }
      return { id: "q1", type: "single", timer_seconds: 10 };
    });

    const kafkaMock = { publish: vi.fn().mockResolvedValue({}) };

    const testService = new ParticipantService(
      kafkaMock,
      sessionRepository,
      participantRepository,
      valkeyMock,
      sessionService,
    );

    const session = {
      id: "s1",
      quizzId: "quiz1",
      currentQuestionId: "q1",
      status: "QUESTION_ACTIVE",
    };
    vi.spyOn(sessionRepository, "find").mockResolvedValue(session);

    const playerCount = 50;
    const promises = [];

    for (let i = 0; i < playerCount; i++) {
      promises.push(
        testService.submitResponse({
          sessionId: "s1",
          participantId: `p${i}`,
          choiceIds: ["c1"],
        }),
      );
    }

    await Promise.all(promises);

    expect(call).toHaveBeenCalledTimes(playerCount * 2);
    expect(kafkaMock.publish).toHaveBeenCalledTimes(playerCount);
  });
});
