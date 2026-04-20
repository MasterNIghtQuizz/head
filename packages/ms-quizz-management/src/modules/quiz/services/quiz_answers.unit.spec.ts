import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizService } from "./quiz.service.js";
import {
  createQuizEntity,
  createQuestionEntity,
  createChoiceEntity,
} from "../../../tests/factories/quiz.factory.js";

describe("QuizService Answers Unit Tests", () => {
  let service: QuizService;
  let quizRepositoryMock: unknown;
  let valkeyRepositoryMock: unknown;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
    };

    quizRepositoryMock = {
      findByIdWithChildren: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    service = new QuizService(
      quizRepositoryMock as import("../core/ports/quiz.repository.js").IQuizRepository,
      3600,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getQuizAnswers", () => {
    it("should return answers from cache if available", async () => {
      const cached = { answers: [{ questionId: "q1", choiceId: "c1" }] };
      (
        (valkeyRepositoryMock as { get: import("vitest").Mock }).get
      ).mockResolvedValue(cached);

      const result = await service.getQuizAnswers("quiz-1");

      expect(
        (valkeyRepositoryMock as { get: import("vitest").Mock }).get,
      ).toHaveBeenCalledWith("quiz:answers:quiz-1");
      expect(result).toEqual(cached);
      expect(
        (quizRepositoryMock as { findByIdWithChildren: import("vitest").Mock })
          .findByIdWithChildren,
      ).not.toHaveBeenCalled();
    });

    it("should fetch from repository, format and cache if not in cache", async () => {
      (
        (valkeyRepositoryMock as { get: import("vitest").Mock }).get
      ).mockResolvedValue(null);

      const choice1 = createChoiceEntity({ id: "c1", is_correct: true });
      const choice2 = createChoiceEntity({ id: "c2", is_correct: false });
      const question1 = createQuestionEntity({
        id: "q1",
        choices: [choice1, choice2],
      });
      const quiz = createQuizEntity({ id: "quiz-1", questions: [question1] });

      (
        (quizRepositoryMock as { findByIdWithChildren: import("vitest").Mock })
          .findByIdWithChildren
      ).mockResolvedValue(quiz);

      const result = await service.getQuizAnswers("quiz-1");

      expect(
        (quizRepositoryMock as { findByIdWithChildren: import("vitest").Mock })
          .findByIdWithChildren,
      ).toHaveBeenCalledWith("quiz-1");
      expect(result).toEqual({
        answers: [{ questionId: "q1", choiceId: "c1" }],
      });
      expect(
        (valkeyRepositoryMock as { set: import("vitest").Mock }).set,
      ).toHaveBeenCalledWith("quiz:answers:quiz-1", result, 3600);
    });

    it("should throw NOT_FOUND if quiz does not exist", async () => {
      (
        (valkeyRepositoryMock as { get: import("vitest").Mock }).get
      ).mockResolvedValue(null);
      (
        (quizRepositoryMock as { findByIdWithChildren: import("vitest").Mock })
          .findByIdWithChildren
      ).mockResolvedValue(null);

      await expect(service.getQuizAnswers("unknown")).rejects.toThrow();
    });
  });
});
