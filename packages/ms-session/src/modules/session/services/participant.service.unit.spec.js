import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ParticipantService } from "./participant.service.js";
import {
  createSessionEntity,
  createParticipantEntity,
} from "./test-helpers.js";
import {
  SessionStatus,
  SessionEventTypes,
  QuestionType,
  ParticipantRoles,
} from "common-contracts";
import { TokenService } from "common-auth";
import { call } from "common-axios";
import {
  SESSION_NOT_FOUND,
  SESSION_INVALID_STATUS,
  QUESTION_TIMED_OUT,
  INVALID_CHOICE_IDS,
  UNAUTHORIZED_HOST,
} from "../errors/session.errors.js";

vi.mock("common-axios");
vi.mock("common-auth");

/**
 * @typedef {import('vitest').Mocked<import('../core/ports/session.repository.js').ISessionRepository>} SessionRepositoryMock
 * @typedef {import('vitest').Mocked<import('../core/ports/participant.repository.js').IParticipantRepository>} ParticipantRepositoryMock
 * @typedef {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} ValkeyRepositoryMock
 * @typedef {import('vitest').Mocked<import('common-kafka').KafkaProducer>} KafkaProducerMock
 * @typedef {import('vitest').Mocked<import('./session.service.js').SessionService>} SessionServiceMock
 * @typedef {import('vitest').Mocked<import('../infra/repositories/buzzer.repository.js').BuzzerRepository>} BuzzerRepositoryMock
 */

describe("ParticipantService unit tests", () => {
  /** @type {ParticipantService} */
  let service;
  /** @type {SessionRepositoryMock} */
  let sessionRepositoryMock;
  /** @type {ParticipantRepositoryMock} */
  let participantRepositoryMock;
  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;
  /** @type {KafkaProducerMock} */
  let kafkaProducerMock;
  /** @type {SessionServiceMock} */
  let sessionServiceMock;
  /** @type {BuzzerRepositoryMock} */
  let buzzerRepositoryMock;

  beforeEach(() => {
    // @ts-ignore
    sessionRepositoryMock = /** @type {SessionRepositoryMock} */ ({
      find: vi.fn(),
      findByPublicKey: vi.fn(),
    });
    // @ts-ignore
    participantRepositoryMock = /** @type {ParticipantRepositoryMock} */ ({
      find: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    });
    // @ts-ignore
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
    });
    // @ts-ignore
    kafkaProducerMock = /** @type {KafkaProducerMock} */ ({
      publish: vi.fn(),
    });
    // @ts-ignore
    sessionServiceMock = /** @type {SessionServiceMock} */ ({
      deleteSession: vi.fn(),
      getCurrentQuestion: vi.fn(),
    });
    // @ts-ignore
    buzzerRepositoryMock = /** @type {BuzzerRepositoryMock} */ ({
      push: vi.fn(),
      hasBuzzed: vi.fn(),
      peek: vi.fn(),
      pop: vi.fn(),
      clear: vi.fn(),
    });

    service = new ParticipantService(
      kafkaProducerMock,
      sessionRepositoryMock,
      participantRepositoryMock,
      valkeyRepositoryMock,
      sessionServiceMock,
      buzzerRepositoryMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("joinSession", () => {
    it("should successfully join a session", async () => {
      const data = { session_public_key: "pub", participant_nickname: "nick" };
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.LOBBY,
      });

      vi.mocked(sessionRepositoryMock.findByPublicKey).mockResolvedValue(
        session,
      );
      vi.mocked(participantRepositoryMock.create).mockResolvedValue(
        createParticipantEntity(),
      );
      vi.mocked(TokenService.signGameToken).mockReturnValue("tok");

      const result = await service.joinSession(data);

      expect(participantRepositoryMock.create).toHaveBeenCalled();
      expect(result.game_token).toBe("tok");
    });

    it("should throw SESSION_NOT_FOUND if public key is invalid", async () => {
      vi.mocked(sessionRepositoryMock.findByPublicKey).mockResolvedValue(null);
      await expect(
        service.joinSession({
          session_public_key: "wrong",
          participant_nickname: "",
        }),
      ).rejects.toThrow(SESSION_NOT_FOUND("wrong").message);
    });

    it("should throw SESSION_INVALID_STATUS if session not in LOBBY", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.QUESTION_ACTIVE,
      });
      vi.mocked(sessionRepositoryMock.findByPublicKey).mockResolvedValue(
        session,
      );
      await expect(
        service.joinSession({
          session_public_key: "pub",
          participant_nickname: "",
        }),
      ).rejects.toThrow(SESSION_INVALID_STATUS("s1").message);
    });
  });

  describe("leaveSession", () => {
    it("should delete participant", async () => {
      const participant = createParticipantEntity({ id: "p1" });
      vi.mocked(participantRepositoryMock.find).mockResolvedValue(participant);

      await service.leaveSession("p1");

      expect(participantRepositoryMock.delete).toHaveBeenCalledWith("p1");
    });

    it("should do nothing if participant not found", async () => {
      vi.mocked(participantRepositoryMock.find).mockResolvedValue(null);
      await service.leaveSession("p1");
      expect(participantRepositoryMock.delete).not.toHaveBeenCalled();
    });
  });

  describe("submitResponse", () => {
    const defaultParams = {
      sessionId: "s1",
      participantId: "p1",
      choiceIds: ["c1"],
    };
    const session = createSessionEntity({
      id: "s1",
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: "q1",
      quizzId: "quiz1",
    });

    it("should successfully submit response", async () => {
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockImplementation(
        async (/** @type {string} */ key) => {
          if (key.includes("validation")) {
            return {
              id: "q1",
              type: "single",
              timer_seconds: 10,
              choiceIds: ["c1"],
            };
          }
          if (key.includes("question_activated_at")) {
            return Date.now();
          }
          return null;
        },
      );

      await service.submitResponse(defaultParams);

      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        "quizz.events",
        expect.objectContaining({
          eventType: SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
          payload: expect.objectContaining({
            sessionId: "s1",
            participantId: "p1",
            questionId: "q1",
            choiceId: "c1",
            submittedAt: expect.any(String),
          }),
        }),
      );
    });

    it("should throw QUESTION_TIMED_OUT if too late", async () => {
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockImplementation(
        async (/** @type {string} */ key) => {
          if (key.includes("validation")) {
            return {
              id: "q1",
              type: "single",
              timer_seconds: 10,
              choiceIds: ["c1"],
            };
          }
          if (key.includes("question_activated_at")) {
            return Date.now() - 20000;
          } // 10s timer
          return null;
        },
      );

      await expect(service.submitResponse(defaultParams)).rejects.toThrow(
        QUESTION_TIMED_OUT().message,
      );
    });

    it("should throw INVALID_CHOICE_IDS if choiceId not in question choices", async () => {
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockImplementation(
        async (/** @type {string} */ key) => {
          if (key.includes("validation")) {
            return {
              id: "q1",
              type: "single",
              timer_seconds: 10,
              choiceIds: ["c1"],
            };
          }
          if (key.includes("question_activated_at")) {
            return Date.now();
          }
          return null;
        },
      );

      await expect(
        service.submitResponse({ ...defaultParams, choiceIds: ["wrong"] }),
      ).rejects.toThrow(INVALID_CHOICE_IDS(["wrong"]).message);
    });
  });

  describe("submitResponse Resilience", () => {
    it("should fallback to management service if Valkey fails to provide validation data", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.QUESTION_ACTIVE,
        currentQuestionId: "q1",
        quizzId: "quiz1",
      });
      const questionMetadata = { id: "q1", type: "single", timer_seconds: 10 };
      const choiceIds = ["c1"];

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockRejectedValue(
        new Error("Valkey Down"),
      );
      vi.mocked(call).mockImplementation(async (cfg) => {
        if (cfg.url.includes("/choices/ids")) {
          return choiceIds;
        }
        return questionMetadata;
      });
      vi.mocked(TokenService.signInternalToken).mockReturnValue("tok");

      await service.submitResponse({
        sessionId: "s1",
        participantId: "p1",
        choiceIds: ["c1"],
      });

      expect(call).toHaveBeenCalledTimes(2);
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        "quizz.events",
        expect.objectContaining({
          eventType: SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
        }),
      );
    });
  });

  describe("Buzzer logic", () => {
    const sessionId = "s1";
    const participantId = "p1";
    const session = createSessionEntity({
      id: sessionId,
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: "q1",
    });

    describe("submitResponse (Buzzer)", () => {
      it("should successfully delegate to _handleBuzzerSubmit when question type is buzzer", async () => {
        vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
        vi.mocked(participantRepositoryMock.find).mockResolvedValue(
          createParticipantEntity({ id: participantId, nickname: "nick" }),
        );
        vi.mocked(valkeyRepositoryMock.get).mockImplementation(async (key) => {
          if (key.includes("validation")) {
            return { id: "q1", type: QuestionType.BUZZER, timer_seconds: 10 };
          }
          if (key.includes("question_activated_at")) {
            return Date.now();
          }
          return null;
        });

        await service.submitResponse({
          sessionId,
          participantId,
          choiceIds: [],
        });

        expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
          SessionEventTypes.FEED_BUZZER_QUEUE,
          expect.objectContaining({
            sessionId,
            participantId,
            username: "nick",
          }),
        );
      });
    });

    describe("_handleBuzzerSubmit", () => {
      it("should publish to FEED_BUZZER_QUEUE", async () => {
        vi.mocked(participantRepositoryMock.find).mockResolvedValue(
          createParticipantEntity({ id: participantId, nickname: "nick" }),
        );

        await service._handleBuzzerSubmit(session, participantId);

        expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
          SessionEventTypes.FEED_BUZZER_QUEUE,
          expect.objectContaining({
            sessionId,
            participantId,
            username: "nick",
          }),
        );
        expect(buzzerRepositoryMock.push).not.toHaveBeenCalled();
      });
    });

    describe("answerBuzzer", () => {
      beforeEach(() => {
        vi.mocked(participantRepositoryMock.find).mockResolvedValue(
          createParticipantEntity({
            id: "h1",
            role: ParticipantRoles.HOST,
            sessionId,
          }),
        );
      });

      it("should publish BUZZER_ANSWER_SUBMITTED and clear queue if correct", async () => {
        const buzzer = {
          sessionId,
          participantId,
          username: "nick",
          questionId: "q1",
          pressedAt: new Date().toISOString(),
        };
        vi.mocked(buzzerRepositoryMock.peek).mockResolvedValue(buzzer);
        vi.mocked(sessionRepositoryMock.find).mockResolvedValue(
          createSessionEntity({ id: sessionId, hostId: "some-user-id" }),
        );

        await service.answerBuzzer({
          sessionId,
          hostId: "h1",
          participantId,
          isCorrect: true,
        });

        expect(buzzerRepositoryMock.clear).toHaveBeenCalledWith(sessionId);
        expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
          SessionEventTypes.BUZZER_ANSWER_SUBMITTED,
          expect.objectContaining({
            sessionId,
            participantId,
            isCorrect: true,
          }),
        );
      });

      it("should publish BUZZER_ANSWER_SUBMITTED and pop if incorrect", async () => {
        const buzzer = {
          sessionId,
          participantId,
          username: "nick",
          questionId: "q1",
          pressedAt: new Date().toISOString(),
        };
        vi.mocked(buzzerRepositoryMock.peek).mockResolvedValue(buzzer);
        vi.mocked(sessionRepositoryMock.find).mockResolvedValue(
          createSessionEntity({ id: sessionId, hostId: "some-user-id" }),
        );

        await service.answerBuzzer({
          sessionId,
          hostId: "h1",
          participantId,
          isCorrect: false,
        });

        expect(buzzerRepositoryMock.pop).toHaveBeenCalledWith(sessionId);
        expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
          SessionEventTypes.BUZZER_ANSWER_SUBMITTED,
          expect.objectContaining({
            sessionId,
            participantId,
            isCorrect: false,
          }),
        );
      });

      it("should throw UNAUTHORIZED_HOST if hostId mismatch", async () => {
        vi.mocked(sessionRepositoryMock.find).mockResolvedValue(
          createSessionEntity({ id: sessionId, hostId: "some-user-id" }),
        );
        vi.mocked(participantRepositoryMock.find).mockResolvedValue(
          createParticipantEntity({
            id: "wrong",
            role: ParticipantRoles.PLAYER,
            sessionId,
          }),
        );

        await expect(
          service.answerBuzzer({
            sessionId,
            hostId: "wrong",
            participantId,
            isCorrect: true,
          }),
        ).rejects.toThrow(UNAUTHORIZED_HOST().message);
      });

      it("should throw error if participant mismatch", async () => {
        const buzzer = {
          sessionId,
          participantId: "other",
          username: "other",
          questionId: "q1",
          pressedAt: new Date().toISOString(),
        };
        vi.mocked(buzzerRepositoryMock.peek).mockResolvedValue(buzzer);
        vi.mocked(sessionRepositoryMock.find).mockResolvedValue(
          createSessionEntity({ id: sessionId, hostId: "some-user-id" }),
        );

        await expect(
          service.answerBuzzer({
            sessionId,
            hostId: "h1",
            participantId,
            isCorrect: true,
          }),
        ).rejects.toThrow();
      });
    });

    describe("getCurrentBuzzer", () => {
      it("should return peeked buzzer", async () => {
        const buzzer = {
          sessionId,
          participantId,
          username: "u",
          questionId: "q1",
          pressedAt: "t",
        };
        vi.mocked(buzzerRepositoryMock.peek).mockResolvedValue(buzzer);

        const result = await service.getCurrentBuzzer(sessionId);

        expect(result).toEqual(buzzer);
        expect(buzzerRepositoryMock.peek).toHaveBeenCalledWith(sessionId);
      });
    });

    describe("resetBuzzerQueue", () => {
      it("should clear buzzer repository", async () => {
        await service.resetBuzzerQueue(sessionId);
        expect(buzzerRepositoryMock.clear).toHaveBeenCalledWith(sessionId);
      });
    });
  });
});
