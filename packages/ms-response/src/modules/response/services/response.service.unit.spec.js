import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ResponseService } from "./response.service.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("ResponseService Unit Tests", () => {
  /** @type {ResponseService} */
  let service;

  /** @type {{
   * findByParticipantAndQuestion: Mock,
   * create: Mock,
   * findByParticipantAndSession: Mock,
   * findByQuestionAndSession: Mock,
   * findBySession: Mock,
   * deleteBySessionId: Mock,
   * valkeyRepository: any
   * }}
   */
  let responseRepositoryMock;

  /** @type {{ getChoice: Mock }} */
  let quizClientMock;

  /** @type {{ get: Mock, set: Mock }} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
    };

    responseRepositoryMock = {
      findByParticipantAndQuestion: vi.fn(),
      create: vi.fn(),
      findByParticipantAndSession: vi.fn(),
      findByQuestionAndSession: vi.fn(),
      findBySession: vi.fn(),
      deleteBySessionId: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    quizClientMock = {
      getChoice: vi.fn(),
    };

    service = new ResponseService(
      responseRepositoryMock,
      quizClientMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleAnswer", () => {
    it("should create QCM response if not already answered", async () => {
      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue(null);
      responseRepositoryMock.create.mockResolvedValue({ id: "resp-1" });

      const result = await service.handleAnswer({
        participantId: "p1",
        questionId: "q1",
        sessionId: "s1",
        choice_id: "c1",
      });

      expect(responseRepositoryMock.create).toHaveBeenCalled();
      expect(result.id).toBe("resp-1");
    });

    it("should throw if participant already answered QCM", async () => {
      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue({
        id: "existing",
      });

      await expect(
        service.handleAnswer({
          participantId: "p1",
          questionId: "q1",
          sessionId: "s1",
          choice_id: "c1",
        }),
      ).rejects.toThrow("ALREADY_ANSWERED");
    });

    it("should create buzzer response without duplicate check", async () => {
      responseRepositoryMock.create.mockResolvedValue({ id: "resp-1" });

      const result = await service.handleAnswer({
        participantId: "p1",
        questionId: "q1",
        sessionId: "s1",
        is_correct: true,
      });

      expect(
        responseRepositoryMock.findByParticipantAndQuestion,
      ).not.toHaveBeenCalled();

      expect(result.id).toBe("resp-1");
    });

    it("should throw if repository create fails", async () => {
      responseRepositoryMock.findByParticipantAndQuestion.mockResolvedValue(null);
      responseRepositoryMock.create.mockRejectedValue(new Error("DB FAIL"));

      await expect(
        service.handleAnswer({
          participantId: "p1",
          questionId: "q1",
          sessionId: "s1",
          choice_id: "c1",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getResponsesByParticipant", () => {
    it("should return participant responses", async () => {
      responseRepositoryMock.findByParticipantAndSession.mockResolvedValue([
        { id: "r1" },
      ]);

      const result = await service.getResponsesByParticipant("p1", "s1");

      expect(
        responseRepositoryMock.findByParticipantAndSession,
      ).toHaveBeenCalledWith("p1", "s1");

      expect(result).toHaveLength(1);
    });
  });

  describe("clearSession", () => {
    it("should delete all responses for session", async () => {
      await service.clearSession("s1");

      expect(
        responseRepositoryMock.deleteBySessionId,
      ).toHaveBeenCalledWith("s1");
    });
  });

  describe("getIsCorrectFromCache", () => {
    it("should return is_correct from cached quiz", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(
        JSON.stringify({
          questions: [
            {
              id: "q1",
              choices: [
                { id: "c1", is_correct: true },
              ],
            },
          ],
        }),
      );

      const result = await service.getIsCorrectFromCache(
        "quiz1",
        "q1",
        "c1",
      );

      expect(result).toBe(true);
    });

    it("should throw if question not found", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(
        JSON.stringify({
          questions: [],
        }),
      );

      await expect(
        service.getIsCorrectFromCache("quiz1", "q1", "c1"),
      ).rejects.toThrow("QUESTION_NOT_FOUND");
    });

    it("should throw if choice not found", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(
        JSON.stringify({
          questions: [
            {
              id: "q1",
              choices: [],
            },
          ],
        }),
      );

      await expect(
        service.getIsCorrectFromCache("quiz1", "q1", "c1"),
      ).rejects.toThrow("CHOICE_NOT_FOUND");
    });
  });

  describe("fetchQuizz", () => {
    it("should cache fetched quiz", async () => {
      const mockQuiz = { id: "quiz1" };

      vi.spyOn(service, "getToken").mockReturnValue("token");

      const callMock = vi.spyOn(await import("common-axios"), "call");
      callMock.mockResolvedValue(mockQuiz);

      const request = { headers: {} };

      const result = await service.fetchQuizz(
        "quiz1",
        "host1",
        request,
      );

      expect(result).toEqual(mockQuiz);

      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
    });

    it("should throw if quiz not found", async () => {
      vi.spyOn(service, "getToken").mockReturnValue("token");

      const callMock = vi.spyOn(await import("common-axios"), "call");
      callMock.mockResolvedValue(null);

      await expect(
        service.fetchQuizz(
          "quiz1",
          "host1",
          { headers: {} },
        ),
      ).rejects.toThrow("QUIZ_NOT_FOUND");
    });
  });
});
