import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionService } from "./session.service.js";
import {
  createSessionEntity,
  createParticipantEntity,
} from "./test-helpers.js";
import {
  SessionStatus,
  ParticipantRoles,
  SessionEventTypes,
  QuestionType,
} from "common-contracts";
import { call } from "common-axios";
import { CryptoService } from "common-crypto";
import { TokenService } from "common-auth";
import {
  SESSION_NOT_FOUND,
  SESSION_INVALID_STATUS,
  QUIZZ_NOT_FOUND,
  EMPTY_QUIZZ,
} from "../errors/session.errors.js";
import { Question } from "common-core";

vi.mock("common-axios");
vi.mock("common-crypto");
vi.mock("common-auth");

/**
 * @typedef {import('vitest').Mocked<import('../core/ports/session.repository.js').ISessionRepository>} SessionRepositoryMock
 * @typedef {import('vitest').Mocked<import('../core/ports/participant.repository.js').IParticipantRepository>} ParticipantRepositoryMock
 * @typedef {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} ValkeyRepositoryMock
 * @typedef {import('vitest').Mocked<import('common-kafka').KafkaProducer>} KafkaProducerMock
 * @typedef {import('vitest').Mocked<import('../infra/repositories/buzzer.repository.js').BuzzerRepository>} BuzzerRepositoryMock
 */

describe("SessionService unit tests", () => {
  /** @type {SessionService} */
  let service;
  /** @type {SessionRepositoryMock} */
  let sessionRepositoryMock;
  /** @type {ParticipantRepositoryMock} */
  let participantRepositoryMock;
  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;
  /** @type {KafkaProducerMock} */
  let kafkaProducerMock;
  /** @type {BuzzerRepositoryMock} */
  let buzzerRepositoryMock;

  beforeEach(() => {
    // @ts-ignore
    sessionRepositoryMock = /** @type {SessionRepositoryMock} */ ({
      find: vi.fn(),
      findByPublicKey: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    });
    // @ts-ignore
    participantRepositoryMock = /** @type {ParticipantRepositoryMock} */ ({
      find: vi.fn(),
      findBySessionId: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    });
    // @ts-ignore
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    });
    // @ts-ignore
    kafkaProducerMock = /** @type {KafkaProducerMock} */ ({
      publish: vi.fn(),
      connect: vi.fn(),
    });
    // @ts-ignore
    buzzerRepositoryMock = /** @type {BuzzerRepositoryMock} */ ({
      clear: vi.fn(),
      peek: vi.fn(),
    });

    service = new SessionService(
      kafkaProducerMock,
      sessionRepositoryMock,
      participantRepositoryMock,
      valkeyRepositoryMock,
      buzzerRepositoryMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    it("should create a session and a host participant", async () => {
      const data = { quiz_id: "q1" };
      const headers = { "internal-token": "tok" };
      const quiz = { questions: [{ id: "qu1" }] };
      const session = createSessionEntity({ id: "s1" });
      const host = createParticipantEntity({
        id: "p1",
        role: ParticipantRoles.HOST,
      });

      vi.mocked(call).mockResolvedValue(quiz);
      vi.mocked(CryptoService.verify).mockReturnValue({ userId: "h1" });
      vi.mocked(sessionRepositoryMock.create).mockResolvedValue(session);
      vi.mocked(participantRepositoryMock.create).mockResolvedValue(host);
      vi.mocked(TokenService.signGameToken).mockReturnValue("game-tok");

      const result = await service.createSession(data, headers);

      expect(sessionRepositoryMock.create).toHaveBeenCalled();
      expect(participantRepositoryMock.create).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        `session:s1:questions:ids`,
        ["qu1"],
        3600,
      );
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        `question:qu1:validation`,
        expect.any(Object),
        3600,
      );
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        `question:qu1:full`,
        expect.any(Question),
        3600,
      );
      expect(result.session_id).toBe(session.id);
      expect(result.game_token).toBe("game-tok");
    });

    it("should throw QUIZZ_NOT_FOUND if quiz service returns null", async () => {
      vi.mocked(call).mockResolvedValue(null);
      await expect(
        service.createSession({ quiz_id: "q1" }, {}),
      ).rejects.toThrow(QUIZZ_NOT_FOUND("q1").message);
    });

    it("should throw EMPTY_QUIZZ if quiz has no questions", async () => {
      vi.mocked(call).mockResolvedValue({ questions: [] });
      await expect(
        service.createSession({ quiz_id: "q1" }, {}),
      ).rejects.toThrow(EMPTY_QUIZZ("q1").message);
    });
  });

  describe("getSession", () => {
    it("should return session with participants mapped", async () => {
      const session = createSessionEntity({ id: "s1" });
      const participants = [createParticipantEntity({ id: "p1" })];

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(participantRepositoryMock.findBySessionId).mockResolvedValue(
        participants,
      );

      const result = await service.getSession("s1");

      expect(result.session_id).toBe("s1");
      expect(result.participants).toHaveLength(1);
    });

    it("should throw SESSION_NOT_FOUND if session not exists", async () => {
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(null);
      await expect(service.getSession("s1")).rejects.toThrow(
        SESSION_NOT_FOUND("s1").message,
      );
    });
  });

  describe("startSession", () => {
    it("should update session status and store activation time", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.LOBBY,
        quizzId: "q1",
      });
      const quiz = { questions: [{ id: "qu1" }] };

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(call).mockResolvedValue(quiz);

      await service.startSession("s1", {});

      expect(sessionRepositoryMock.update).toHaveBeenCalledWith("s1", {
        status: SessionStatus.QUESTION_ACTIVE,
        currentQuestionId: "qu1",
      });
      expect(buzzerRepositoryMock.clear).toHaveBeenCalledWith("s1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        `session:s1:question_activated_at`,
        expect.any(Number),
      );
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        SessionEventTypes.SESSION_STARTED,
        expect.objectContaining({ session_id: "s1" }),
      );
    });

    it("should throw SESSION_INVALID_STATUS if not in LOBBY", async () => {
      const session = createSessionEntity({
        status: SessionStatus.QUESTION_ACTIVE,
      });
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      await expect(service.startSession("s1", {})).rejects.toThrow(
        SESSION_INVALID_STATUS("s1").message,
      );
    });
  });

  describe("nextQuestion", () => {
    it("should move to next question if available", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.QUESTION_ACTIVE,
        currentQuestionId: "qu1",
        quizzId: "q1",
      });
      const questionIds = ["qu1", "qu2"];

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockResolvedValue(questionIds);

      await service.nextQuestion("s1", {});

      expect(sessionRepositoryMock.update).toHaveBeenCalledWith("s1", {
        status: SessionStatus.QUESTION_ACTIVE,
        currentQuestionId: "qu2",
      });
      expect(buzzerRepositoryMock.clear).toHaveBeenCalledWith("s1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        `session:s1:question_activated_at`,
        expect.any(Number),
      );
    });

    it("should end session if no more questions", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.QUESTION_ACTIVE,
        currentQuestionId: "qu2",
        quizzId: "quiz-123",
      });
      const questionIds = ["qu1", "qu2"];

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockResolvedValue(questionIds);
      const endSessionSpy = vi.spyOn(service, "endSession").mockResolvedValue();

      await service.nextQuestion("s1", {});

      expect(endSessionSpy).toHaveBeenCalledWith("s1");
    });
  });

  describe("endSession", () => {
    it("should update status to FINISHED", async () => {
      const session = createSessionEntity({ id: "s1" });
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);

      await service.endSession("s1");

      expect(sessionRepositoryMock.update).toHaveBeenCalledWith("s1", {
        status: SessionStatus.FINISHED,
      });
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        SessionEventTypes.SESSION_ENDED,
        expect.objectContaining({ session_id: "s1" }),
      );
    });
  });

  describe("deleteSession", () => {
    it("should delete from repo and clear cache", async () => {
      const session = createSessionEntity({ id: "s1" });
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(participantRepositoryMock.findBySessionId).mockResolvedValue(
        [],
      );

      await service.deleteSession("s1");

      expect(sessionRepositoryMock.delete).toHaveBeenCalledWith("s1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        `session:s1:questions:ids`,
      );
    });
  });

  describe("Resilience", () => {
    it("startSession should continue if Valkey fails", async () => {
      const session = createSessionEntity({
        id: "s1",
        status: SessionStatus.LOBBY,
      });
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(call).mockResolvedValue({ questions: [{ id: "qu1" }] });
      vi.mocked(valkeyRepositoryMock.set).mockRejectedValue(
        new Error("Valkey Down"),
      );

      await service.startSession("s1", {});

      expect(sessionRepositoryMock.update).toHaveBeenCalled();
      expect(kafkaProducerMock.publish).toHaveBeenCalled();
    });
  });

  describe("getCurrentQuestion", () => {
    it("should return question with current buzzer for buzzer question", async () => {
      const session = createSessionEntity({
        id: "s1",
        currentQuestionId: "q1",
      });
      const cachedQuestion = {
        id: "q1",
        type: QuestionType.BUZZER,
        label: "Buzz",
        timer_seconds: 10,
        choices: [],
      };
      const buzzer = {
        sessionId: "s1",
        participantId: "p1",
        username: "nick",
        questionId: "q1",
        pressedAt: "now",
      };
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockResolvedValue(cachedQuestion);
      vi.mocked(buzzerRepositoryMock.peek).mockResolvedValue(buzzer);

      const result = await service.getCurrentQuestion("s1", {});

      expect(result).toEqual(
        expect.objectContaining({ currentBuzzer: buzzer }),
      );
      expect(buzzerRepositoryMock.peek).toHaveBeenCalledWith("s1");
    });

    it("should publish PING_HOST_FOR_QUEUE when buzzer queue is unavailable", async () => {
      const session = createSessionEntity({
        id: "s1",
        currentQuestionId: "q1",
      });
      const cachedQuestion = {
        id: "q1",
        type: QuestionType.BUZZER,
        label: "Buzz",
        timer_seconds: 10,
        choices: [],
      };
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockResolvedValue(cachedQuestion);
      vi.mocked(buzzerRepositoryMock.peek).mockRejectedValue(
        new Error("Valkey Down"),
      );

      const result = await service.getCurrentQuestion("s1", {});

      expect(result).toEqual(expect.objectContaining({ id: "q1" }));
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        SessionEventTypes.PING_HOST_FOR_QUEUE,
        { sessionId: "s1" },
      );
    });

    it("should not call peek for non buzzer question", async () => {
      const session = createSessionEntity({
        id: "s1",
        currentQuestionId: "q1",
      });
      const cachedQuestion = {
        id: "q1",
        type: QuestionType.MULTIPLE,
        label: "Question",
        timer_seconds: 10,
        choices: [],
      };
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(session);
      vi.mocked(valkeyRepositoryMock.get).mockResolvedValue(cachedQuestion);

      const result = await service.getCurrentQuestion("s1", {});

      expect(result).toEqual(expect.objectContaining({ id: "q1" }));
      expect(buzzerRepositoryMock.peek).not.toHaveBeenCalled();
    });
  });
});
