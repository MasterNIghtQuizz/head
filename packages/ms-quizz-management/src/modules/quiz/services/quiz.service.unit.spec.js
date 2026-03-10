import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizService } from "./quiz.service.js";
import { QuizRepository } from "../repositories/quiz.repository.js";
import { createQuizMock } from "../../../tests/factories/quiz.factory.js";
import {
  CreateQuizRequestDto,
  UpdateQuizRequestDto,
} from "../contracts/quiz.dto.js";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @typedef {import('../models/quiz.model.js').Quiz} Quiz
 * @typedef {import('vitest').Mocked<QuizRepository>} QuizRepositoryMock
 */

describe("QuizService Unit Tests", () => {
  /** @type {QuizService} */
  let quizService;

  /** @type {QuizRepositoryMock} */
  let quizRepositoryMock;

  beforeEach(() => {
    quizRepositoryMock = /** @type {QuizRepositoryMock} */ (
      Object.create(QuizRepository.prototype)
    );
    quizService = new QuizService(quizRepositoryMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuizzes", () => {
    it("should return all quizzes mapped to response", async () => {
      const quiz1 = createQuizMock({ id: "1", title: "Quiz 1" });
      const quiz2 = createQuizMock({ id: "2", title: "Quiz 2" });
      const quizzes = [quiz1, quiz2];

      const findAllSpy = vi
        .spyOn(quizRepositoryMock, "findAll")
        .mockResolvedValue(quizzes);

      const result = await quizService.getAllQuizzes();

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    it("should throw DATABASE_ERROR if repository fails", async () => {
      const findAllSpy = vi
        .spyOn(quizRepositoryMock, "findAll")
        .mockRejectedValue(new Error("DB Error"));

      await expect(quizService.getAllQuizzes()).rejects.toThrow(
        InternalServerError,
      );
      expect(findAllSpy).toHaveBeenCalled();
    });
  });

  describe("getQuizById", () => {
    it("should return a quiz by id", async () => {
      const quiz = createQuizMock({ id: "1" });
      const findOneSpy = vi
        .spyOn(quizRepositoryMock, "findOne")
        .mockResolvedValue(quiz);

      const result = await quizService.getQuizById("1");

      expect(findOneSpy).toHaveBeenCalledWith("1");
      expect(result.id).toBe("1");
    });

    it("should throw QUIZ_NOT_FOUND if quiz does not exist", async () => {
      const findOneSpy = vi
        .spyOn(quizRepositoryMock, "findOne")
        .mockResolvedValue(null);

      await expect(quizService.getQuizById("99")).rejects.toThrow(
        NotFoundError,
      );
      expect(findOneSpy).toHaveBeenCalledWith("99");
    });
  });

  describe("createQuiz", () => {
    it("should create and return a quiz", async () => {
      /** @type {Partial<Quiz>} */
      const quizData = { title: "New Quiz" };
      const createdQuiz = createQuizMock({ id: "new-id", ...quizData });
      const createSpy = vi
        .spyOn(quizRepositoryMock, "create")
        .mockResolvedValue(createdQuiz);

      const result = await quizService.createQuiz(
        new CreateQuizRequestDto(createdQuiz),
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Quiz" }),
      );
      expect(result.id).toBe("new-id");
      expect(result.title).toBe("New Quiz");
    });

    it("should throw QUIZ_CONFLICT if title already exists", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(quizRepositoryMock, "create").mockRejectedValue(error);

      await expect(
        quizService.createQuiz(new CreateQuizRequestDto({ title: "Existing" })),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR if create fails", async () => {
      vi.spyOn(quizRepositoryMock, "create").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(
        quizService.createQuiz(new CreateQuizRequestDto({ title: "Error" })),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("updateQuiz", () => {
    it("should update and return the quiz", async () => {
      const updateData = { title: "Updated Title" };
      const updatedQuiz = createQuizMock({ id: "1", ...updateData });
      const updateSpy = vi
        .spyOn(quizRepositoryMock, "update")
        .mockResolvedValue(updatedQuiz);

      const result = await quizService.updateQuiz(
        "1",
        new UpdateQuizRequestDto(updateData),
      );

      expect(updateSpy).toHaveBeenCalledWith(
        "1",
        expect.objectContaining(updateData),
      );
      expect(result.title).toBe("Updated Title");
    });

    it("should throw QUIZ_NOT_FOUND if quiz to update does not exist", async () => {
      const updateSpy = vi
        .spyOn(quizRepositoryMock, "update")
        // @ts-ignore
        .mockResolvedValue(null);

      await expect(
        quizService.updateQuiz("99", new UpdateQuizRequestDto({})),
      ).rejects.toThrow(NotFoundError);
      expect(updateSpy).toHaveBeenCalledWith("99", expect.any(Object));
    });

    it("should throw QUIZ_CONFLICT if update causes duplicate title", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(quizRepositoryMock, "update").mockRejectedValue(error);

      await expect(
        quizService.updateQuiz("1", new UpdateQuizRequestDto({ title: "Dup" })),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR if update fails unexpectedly", async () => {
      vi.spyOn(quizRepositoryMock, "update").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(
        quizService.updateQuiz("1", new UpdateQuizRequestDto({})),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteQuiz", () => {
    it("should call delete on repository", async () => {
      const deleteSpy = vi
        .spyOn(quizRepositoryMock, "delete")
        .mockResolvedValue(undefined);

      await quizService.deleteQuiz("1");

      expect(deleteSpy).toHaveBeenCalledWith("1");
    });

    it("should throw DATABASE_ERROR if delete fails", async () => {
      vi.spyOn(quizRepositoryMock, "delete").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(quizService.deleteQuiz("1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
