import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ResponseService } from "./response.service.js";
import {
  createResponseEntity,
  createAnswerEvent,
  createQuizPayload,
} from "../tests/factories/response.factory.js";
import { ResponseError } from "../response.constants.js";

vi.mock("common-crypto", () => ({
  CryptoService: {
    sign: vi.fn().mockReturnValue("mocked-jwt-token"),
  },
}));

vi.mock("../../../logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("ResponseService Unit Tests", () => {
  /** @type {ResponseService} */
  let service;

  /** @type {{ create: Mock, update: Mock, findByParticipantAndQuestion: Mock, findByParticipantAndSession: Mock, findByQuestionAndSession: Mock, findBySession: Mock, findByParticipant: Mock, deleteBySessionId: Mock, valkeyRepository: Record<string, Mock> }} */
  let responseRepositoryMock;

  /** @type {{ get: Mock, set: Mock, del: Mock, delByPattern: Mock }} */
  let valkeyRepositoryMock;

  /** @type {{ getQuiz: Mock, getChoice: Mock }} */
  let quizClientMock;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    responseRepositoryMock = {
      create: vi.fn(),
      update: vi.fn(),
      findByParticipantAndQuestion: vi.fn(),
      findByParticipantAndSession: vi.fn(),
      findByQuestionAndSession: vi.fn(),
      findBySession: vi.fn(),
      findByParticipant: vi.fn(),
      deleteBySessionId: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    quizClientMock = {
      getQuiz: vi.fn(),
      getChoice: vi.fn(),
    };

    service = new ResponseService(
      /** @type {import('../core/ports/response.repository.js').ResponseRepository} */ (
        /** @type {unknown} */ (responseRepositoryMock)
      ),
      /** @type {import('common-valkey').ValkeyRepository} */ (
        /** @type {unknown} */ (valkeyRepositoryMock)
      ),
      /** @type {import('../../../infrastructure/clients/quiz.client.js').QuizClient} */ (
        /** @type {unknown} */ (quizClientMock)
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleAnswer", () => {
    it("should create a response for a valid MCQ answer", async () => {
      const event = createAnswerEvent();
      const questionId = "69c16aed-ec7c-8328-baf4-4edc49890473";

      valkeyRepositoryMock.get.mockResolvedValue(questionId);

      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue(
        null,
      );

      const spyIsCorrect = vi
        .spyOn(service, "getIsCorrectFromCache")
        .mockResolvedValue(true);

      const created = createResponseEntity({ isCorrect: true });
      responseRepositoryMock.create.mockResolvedValue(created);

      const result = await service.handleAnswer(event);

      expect(
        responseRepositoryMock.findByParticipantAndQuestion,
      ).toHaveBeenCalledWith(event.participantId, questionId);
      expect(spyIsCorrect).toHaveBeenCalled();
      expect(responseRepositoryMock.create).toHaveBeenCalled();
      expect(result.id).toBe(created.id);
    });

    it("should create a response for a buzzer answer (is_correct defined)", async () => {
      const event = createAnswerEvent({ isCorrect: true, choiceId: null });
      const questionId = "69c16aed-ec7c-8328-baf4-4edc49890473";

      valkeyRepositoryMock.get.mockResolvedValue(questionId);

      const created = createResponseEntity({ isCorrect: true });
      responseRepositoryMock.create.mockResolvedValue(created);

      const spyIsCorrect = vi.spyOn(service, "getIsCorrectFromCache");

      const result = await service.handleAnswer(event);

      expect(spyIsCorrect).not.toHaveBeenCalled();
      expect(
        responseRepositoryMock.findByParticipantAndQuestion,
      ).not.toHaveBeenCalled();
      expect(responseRepositoryMock.create).toHaveBeenCalled();
      expect(result.isCorrect).toBe(true);
    });

    it("should throw ALREADY_ANSWERED if participant already answered", async () => {
      const event = createAnswerEvent();
      const questionId = "69c16aed-ec7c-8328-baf4-4edc49890473";

      valkeyRepositoryMock.get.mockResolvedValue(questionId);

      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue(
        createResponseEntity(),
      );

      await expect(service.handleAnswer(event)).rejects.toThrow(
        ResponseError.ALREADY_ANSWERED,
      );
    });

    it("should throw QUIZ_SERVICE_ERROR when getIsCorrectFromCache fails for MCQ", async () => {
      const event = createAnswerEvent();
      const questionId = "69c16aed-ec7c-8328-baf4-4edc49890473";

      valkeyRepositoryMock.get.mockResolvedValue(questionId);

      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue(
        null,
      );

      vi.spyOn(service, "getIsCorrectFromCache").mockRejectedValue(
        new Error("cache failure"),
      );

      await expect(service.handleAnswer(event)).rejects.toThrow(
        ResponseError.QUIZ_SERVICE_ERROR,
      );
    });

    it("should throw DATABASE_ERROR when repository.create fails", async () => {
      const event = createAnswerEvent({ isCorrect: true });
      const questionId = "69c16aed-ec7c-8328-baf4-4edc49890473";

      valkeyRepositoryMock.get.mockResolvedValue(questionId);

      responseRepositoryMock.create.mockRejectedValue(
        new Error("DB connection lost"),
      );

      await expect(service.handleAnswer(event)).rejects.toThrow(
        /Database operation failed/,
      );
    });
  });

  describe("getResponsesByParticipant", () => {
    it("should delegate to repository.findByParticipantAndSession", async () => {
      const entities = [createResponseEntity()];
      responseRepositoryMock.findByParticipantAndSession.mockResolvedValue(
        entities,
      );

      const result = await service.getResponsesByParticipant(
        "participant-1",
        "session-1",
      );

      expect(
        responseRepositoryMock.findByParticipantAndSession,
      ).toHaveBeenCalledWith("participant-1", "session-1");
      expect(result).toEqual(entities);
    });

    it("should return empty array when no responses found", async () => {
      responseRepositoryMock.findByParticipantAndSession.mockResolvedValue([]);

      const result = await service.getResponsesByParticipant(
        "participant-1",
        "session-1",
      );

      expect(result).toEqual([]);
    });
  });

  describe("getResponsesByQuestion", () => {
    it("should delegate to repository.findByQuestionAndSession", async () => {
      const entities = [createResponseEntity()];
      responseRepositoryMock.findByQuestionAndSession.mockResolvedValue(
        entities,
      );

      const result = await service.getResponsesByQuestion(
        "question-1",
        "session-1",
      );

      expect(
        responseRepositoryMock.findByQuestionAndSession,
      ).toHaveBeenCalledWith("question-1", "session-1");
      expect(result).toEqual(entities);
    });
  });

  describe("getAllSessionResponses", () => {
    it("should delegate to repository.findBySession", async () => {
      const entities = [createResponseEntity(), createResponseEntity()];
      responseRepositoryMock.findBySession.mockResolvedValue(entities);

      const result = await service.getAllSessionResponses("session-1");

      expect(responseRepositoryMock.findBySession).toHaveBeenCalledWith(
        "session-1",
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("clearSession", () => {
    it("should delegate to repository.deleteBySessionId", async () => {
      responseRepositoryMock.deleteBySessionId.mockResolvedValue(undefined);

      await service.clearSession("session-1");

      expect(responseRepositoryMock.deleteBySessionId).toHaveBeenCalledWith(
        "session-1",
      );
    });
  });

  describe("startNewSession", () => {
    it("should cache quizId and first question", async () => {
      const quizPayload = createQuizPayload();

      const fetchSpy = vi
        .spyOn(service, "fetchQuizz")
        .mockResolvedValue(quizPayload);

      await service.startNewSession("session-1", "host-1", "quiz-1");

      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "sessionQuizId:session-1",
        "quiz-1",
        3600,
      );
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "currentSessionQuestion:session-1",
        quizPayload.questions[0].id,
        3600,
      );
      expect(fetchSpy).toHaveBeenCalledWith("quiz-1", "host-1", {});
    });
  });

  describe("fetchQuizz", () => {
    it("should return cached quiz if available", async () => {
      const quizPayload = createQuizPayload();
      valkeyRepositoryMock.get.mockResolvedValue(quizPayload);

      const result = await service.fetchQuizz("quiz-1", "host-1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quiz:quiz-1");
      expect(quizClientMock.getQuiz).not.toHaveBeenCalled();
      expect(result).toEqual(quizPayload);
    });

    it("should fetch from client and cache when not in cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);

      const quizPayload = createQuizPayload();
      quizClientMock.getQuiz.mockResolvedValue(quizPayload);

      const tokenSpy = vi
        .spyOn(service, "getToken")
        .mockReturnValue("mock-internal-token");

      const result = await service.fetchQuizz("quiz-1", "host-1", {
        host: "test",
      });

      expect(tokenSpy).toHaveBeenCalledWith("host-1");
      expect(quizClientMock.getQuiz).toHaveBeenCalledWith("quiz-1", {
        host: "test",
        "internal-token": "mock-internal-token",
      });
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "quiz:quiz-1",
        quizPayload,
        3600,
      );
      expect(result).toEqual(quizPayload);
    });

    it("should throw QUIZ_NOT_FOUND when client returns null", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizClientMock.getQuiz.mockResolvedValue(null);

      vi.spyOn(service, "getToken").mockReturnValue("mock-internal-token");

      await expect(service.fetchQuizz("quiz-1", "host-1")).rejects.toThrow(
        ResponseError.QUIZ_NOT_FOUND,
      );
    });

    it("should still return quiz even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);

      const quizPayload = createQuizPayload();
      quizClientMock.getQuiz.mockResolvedValue(quizPayload);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Valkey down"));

      vi.spyOn(service, "getToken").mockReturnValue("mock-internal-token");

      const result = await service.fetchQuizz("quiz-1", "host-1");

      expect(result).toEqual(quizPayload);
    });
  });

  describe("gotoNextQuestion", () => {
    it("should update currentSessionQuestion in cache", async () => {
      valkeyRepositoryMock.set.mockResolvedValue(undefined);

      await service.gotoNextQuestion("session-1", "question-2");

      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "currentSessionQuestion:session-1",
        "question-2",
        3600,
      );
    });
  });

  describe("getIsCorrectFromCache", () => {
    it("should return true for a correct choice", async () => {
      const quizPayload = createQuizPayload();

      valkeyRepositoryMock.get.mockImplementation(
        /** @param {string} key */ (key) => {
          if (key.startsWith("sessionQuizId:")) {
            return Promise.resolve("quiz-1");
          }
          if (key.startsWith("quiz:")) {
            return Promise.resolve(quizPayload);
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.getIsCorrectFromCache(
        "session-1",
        quizPayload.questions[0].id,
        quizPayload.questions[0].choices[0].id,
      );

      expect(result).toBe(true);
    });

    it("should return false for an incorrect choice", async () => {
      const quizPayload = createQuizPayload();

      valkeyRepositoryMock.get.mockImplementation(
        /** @param {string} key */ (key) => {
          if (key.startsWith("sessionQuizId:")) {
            return Promise.resolve("quiz-1");
          }
          if (key.startsWith("quiz:")) {
            return Promise.resolve(quizPayload);
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.getIsCorrectFromCache(
        "session-1",
        quizPayload.questions[0].id,
        "wrong-choice-id",
      );

      expect(result).toBe(false);
    });

    it("should throw QUIZ_NOT_FOUND when quizId is not cached", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(service, "handleQuizNotFound").mockResolvedValue(null);

      await expect(
        service.getIsCorrectFromCache("session-1", "q1", "c1"),
      ).rejects.toThrow(ResponseError.QUIZ_NOT_FOUND);
    });

    it("should throw QUESTION_NOT_FOUND when question does not exist in quiz", async () => {
      const quizPayload = createQuizPayload();

      valkeyRepositoryMock.get.mockImplementation(
        /** @param {string} key */ (key) => {
          if (key.startsWith("sessionQuizId:")) {
            return Promise.resolve("quiz-1");
          }
          if (key.startsWith("quiz:")) {
            return Promise.resolve(quizPayload);
          }
          return Promise.resolve(null);
        },
      );

      await expect(
        service.getIsCorrectFromCache("session-1", "unknown-question", "c1"),
      ).rejects.toThrow(ResponseError.QUESTION_NOT_FOUND);
    });

    it("should throw CHOICE_NOT_FOUND when choice does not exist in question", async () => {
      const quizPayload = createQuizPayload();

      valkeyRepositoryMock.get.mockImplementation(
        /** @param {string} key */ (key) => {
          if (key.startsWith("sessionQuizId:")) {
            return Promise.resolve("quiz-1");
          }
          if (key.startsWith("quiz:")) {
            return Promise.resolve(quizPayload);
          }
          return Promise.resolve(null);
        },
      );

      await expect(
        service.getIsCorrectFromCache(
          "session-1",
          quizPayload.questions[0].id,
          "unknown-choice",
        ),
      ).rejects.toThrow(ResponseError.CHOICE_NOT_FOUND);
    });
  });

  describe("getToken", () => {
    it("should generate an internal token with correct payload", async () => {
      const { CryptoService } = await import("common-crypto");

      const keySpy = vi
        .spyOn(service, "getKey")
        .mockReturnValue("/fake/key/path");

      const result = service.getToken("host-123");

      expect(keySpy).toHaveBeenCalled();
      expect(CryptoService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "host-123",
          source: "api-gateway",
        }),
        "/fake/key/path",
        expect.objectContaining({ expiresIn: "30s" }),
      );
      expect(result).toBe("mocked-jwt-token");
    });
  });
});
