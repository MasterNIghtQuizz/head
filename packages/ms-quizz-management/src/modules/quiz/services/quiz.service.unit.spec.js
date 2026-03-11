import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizService } from "./quiz.service.js";
import { QuizRepository } from "../repositories/quiz.repository.js";
import { ValkeyRepository } from "common-valkey";
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
 * @typedef {import('vitest').Mocked<ValkeyRepository>} ValkeyRepositoryMock
 */

describe("QuizService Unit Tests", () => {
  /** @type {QuizService} */
  let quizService;

  /** @type {QuizRepositoryMock} */
  let quizRepositoryMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  const CACHE_TTL = 3600;

  beforeEach(() => {
    quizRepositoryMock = /** @type {QuizRepositoryMock} */ (
      Object.create(QuizRepository.prototype)
    );
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    });
    quizService = new QuizService(
      quizRepositoryMock,
      valkeyRepositoryMock,
      CACHE_TTL,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuizzes", () => {
    it("should return all quizzes mapped to response from DB if cache is empty", async () => {
      const quiz1 = createQuizMock({ id: "1", title: "Quiz 1" });
      const quiz2 = createQuizMock({ id: "2", title: "Quiz 2" });
      const quizzes = [quiz1, quiz2];

      valkeyRepositoryMock.get.mockResolvedValue(null);
      const findAllSpy = vi
        .spyOn(quizRepositoryMock, "findAll")
        .mockResolvedValue(quizzes);

      const result = await quizService.getAllQuizzes();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quizzes:all");
      expect(findAllSpy).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("should return all quizzes from cache if available", async () => {
      const cachedResponse = [{ id: "1", title: "Cached Quiz" }];
      valkeyRepositoryMock.get.mockResolvedValue(cachedResponse);
      const findAllSpy = vi.spyOn(quizRepositoryMock, "findAll");

      const result = await quizService.getAllQuizzes();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quizzes:all");
      expect(findAllSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResponse);
    });

    it("should return all quizzes from DB and populate cache if cache is empty", async () => {
      const quizzes = [createQuizMock({ id: "1", title: "DB Quiz" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(quizRepositoryMock, "findAll").mockResolvedValue(quizzes);

      const result = await quizService.getAllQuizzes();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quizzes:all");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "quizzes:all",
        expect.any(Array),
        CACHE_TTL,
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("DB Quiz");
    });

    it("should fallback to DB if cache GET fails", async () => {
      const quizzes = [createQuizMock({ id: "1", title: "Fallback Quiz" })];
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(quizRepositoryMock, "findAll").mockResolvedValue(quizzes);

      const result = await quizService.getAllQuizzes();

      expect(valkeyRepositoryMock.get).toHaveBeenCalled();
      expect(quizRepositoryMock.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should return DB results even if cache SET fails after fetch", async () => {
      const quizzes = [createQuizMock({ id: "1" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(quizRepositoryMock, "findAll").mockResolvedValue(quizzes);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Cache Write Down"));

      const result = await quizService.getAllQuizzes();

      expect(result).toHaveLength(1);
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
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
    it("should return a quiz from cache if available", async () => {
      const cached = { id: "1", title: "Cached" };
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const findOneSpy = vi.spyOn(quizRepositoryMock, "findOne");

      const result = await quizService.getQuizById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quiz:1");
      expect(findOneSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should return quiz from DB and populate cache if cache is empty", async () => {
      const quiz = createQuizMock({ id: "1" });
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(quizRepositoryMock, "findOne").mockResolvedValue(quiz);

      const result = await quizService.getQuizById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quiz:1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "quiz:1",
        expect.any(Object),
        CACHE_TTL,
      );
      expect(result.id).toBe("1");
    });

    it("should fallback to DB if cache GET fails", async () => {
      const quiz = createQuizMock({ id: "1" });
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(quizRepositoryMock, "findOne").mockResolvedValue(quiz);

      const result = await quizService.getQuizById("1");

      expect(result.id).toBe("1");
      expect(quizRepositoryMock.findOne).toHaveBeenCalledWith("1");
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

    it("should invalidate cache on create", async () => {
      const data = new CreateQuizRequestDto({
        title: "New",
        description: "Desc",
      });
      const quiz = createQuizMock({ id: "new" });
      vi.spyOn(quizRepositoryMock, "create").mockResolvedValue(quiz);

      await quizService.createQuiz(data);

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
    });

    it("should succeed even if cache invalidation fails on create", async () => {
      const data = new CreateQuizRequestDto({
        title: "New",
        description: "Desc",
      });
      const quiz = createQuizMock({ id: "new" });
      vi.spyOn(quizRepositoryMock, "create").mockResolvedValue(quiz);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Cache Down"));

      const result = await quizService.createQuiz(data);

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(result.id).toBe("new");
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
    it("should invalidate cache on delete", async () => {
      const quiz = createQuizMock({ id: "1" });
      vi.spyOn(quizRepositoryMock, "findOne").mockResolvedValue(quiz);
      vi.spyOn(quizRepositoryMock, "delete").mockResolvedValue(undefined);

      await quizService.deleteQuiz("1");

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quiz:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
    });

    it("should succeed even if cache invalidation fails on delete", async () => {
      const quiz = createQuizMock({ id: "1" });
      vi.spyOn(quizRepositoryMock, "findOne").mockResolvedValue(quiz);
      vi.spyOn(quizRepositoryMock, "delete").mockResolvedValue(undefined);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Cache Down"));

      await quizService.deleteQuiz("1");

      expect(quizRepositoryMock.delete).toHaveBeenCalledWith("1");
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
