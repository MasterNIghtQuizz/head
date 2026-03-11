import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuestionService } from "./question.service.js";
import { QuestionRepository } from "../repositories/question.repository.js";
// eslint-disable-next-line no-unused-vars
import { ValkeyRepository } from "common-valkey";
import { createQuestionMock } from "../../../tests/factories/question.factory.js";
import { createQuizMock } from "../../../tests/factories/quiz.factory.js";
import { CreateQuestionRequestDto } from "../contracts/question.dto.js";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @typedef {import('../models/question.model.js').Question} Question
 * @typedef {import('vitest').Mocked<QuestionRepository>} QuestionRepositoryMock
 * @typedef {import('vitest').Mocked<ValkeyRepository>} ValkeyRepositoryMock
 */

describe("QuestionService Unit Tests", () => {
  /** @type {QuestionService} */
  let questionService;

  /** @type {QuestionRepositoryMock} */
  let questionRepositoryMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  const CACHE_TTL = 3600;

  beforeEach(() => {
    questionRepositoryMock = /** @type {QuestionRepositoryMock} */ (
      Object.create(QuestionRepository.prototype)
    );
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    });
    questionService = new QuestionService(
      questionRepositoryMock,
      valkeyRepositoryMock,
      CACHE_TTL,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuestions", () => {
    it("should return all questions from DB if cache is empty", async () => {
      const questions = [createQuestionMock({ id: "1" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const spy = vi
        .spyOn(questionRepositoryMock, "findAll")
        .mockResolvedValue(questions);

      const result = await questionService.getAllQuestions();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("questions:all");
      expect(spy).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should return all questions from cache if available", async () => {
      const cached = [{ id: "1", label: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const spy = vi.spyOn(questionRepositoryMock, "findAll");

      const result = await questionService.getAllQuestions();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("questions:all");
      expect(spy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(questionRepositoryMock, "findAll").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(questionService.getAllQuestions()).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("getQuestionById", () => {
    it("should return a question from cache if available", async () => {
      const cached = { id: "1", label: "Cached" };
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const findOneSpy = vi.spyOn(questionRepositoryMock, "findOne");

      const result = await questionService.getQuestionById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("question:1");
      expect(findOneSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should return question from DB and populate cache if cache is empty", async () => {
      const question = createQuestionMock({ id: "1" });
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(questionRepositoryMock, "findOne").mockResolvedValue(question);

      const result = await questionService.getQuestionById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("question:1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "question:1",
        expect.any(Object),
        CACHE_TTL,
      );
      expect(result.id).toBe("1");
    });

    it("should fallback to DB if cache GET fails", async () => {
      const question = createQuestionMock({ id: "1" });
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(questionRepositoryMock, "findOne").mockResolvedValue(question);

      const result = await questionService.getQuestionById("1");

      expect(result.id).toBe("1");
      expect(questionRepositoryMock.findOne).toHaveBeenCalledWith("1");
    });

    it("should throw if question not found", async () => {
      const spy = vi
        .spyOn(questionRepositoryMock, "findOne")
        .mockResolvedValue(null);

      await expect(questionService.getQuestionById("99")).rejects.toThrow(
        NotFoundError,
      );
      expect(spy).toHaveBeenCalledWith("99");
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(questionRepositoryMock, "findOne").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(questionService.getQuestionById("1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("getQuestionsByIds", () => {
    it("should return questions by multiple ids", async () => {
      const questions = [
        createQuestionMock({ id: "1" }),
        createQuestionMock({ id: "2" }),
      ];
      const spy = vi
        .spyOn(questionRepositoryMock, "findByIds")
        .mockResolvedValue(questions);

      const result = await questionService.getQuestionsByIds(["1", "2"]);

      expect(spy).toHaveBeenCalledWith(["1", "2"]);
      expect(result).toHaveLength(2);
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(questionRepositoryMock, "findByIds").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(questionService.getQuestionsByIds(["1"])).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("getQuestionsByQuizId", () => {
    it("should return questions from cache if available", async () => {
      const cached = [{ id: "1", label: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const findByQuizIdSpy = vi.spyOn(questionRepositoryMock, "findByQuizId");

      const result = await questionService.getQuestionsByQuizId("q1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "quiz:questions:q1",
      );
      expect(findByQuizIdSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should return questions from DB and populate cache if cache is empty", async () => {
      const questions = [createQuestionMock({ id: "1" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(questionRepositoryMock, "findByQuizId").mockResolvedValue(
        questions,
      );

      const result = await questionService.getQuestionsByQuizId("q1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "quiz:questions:q1",
      );
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "quiz:questions:q1",
        expect.any(Array),
        CACHE_TTL,
      );
      expect(result).toHaveLength(1);
    });

    it("should fallback to DB if cache GET fails", async () => {
      const questions = [createQuestionMock({ id: "1" })];
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(questionRepositoryMock, "findByQuizId").mockResolvedValue(
        questions,
      );

      const result = await questionService.getQuestionsByQuizId("q1");

      expect(result).toHaveLength(1);
      expect(questionRepositoryMock.findByQuizId).toHaveBeenCalledWith("q1");
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(questionRepositoryMock, "findByQuizId").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(questionService.getQuestionsByQuizId("q1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("createQuestion", () => {
    it("should invalidate cache on create", async () => {
      /** @type {any} */
      const data = {
        label: "Test?",
        quiz_id: "q1",
        type: "multiple",
        order_index: 0,
        timer_seconds: 30,
      };
      const created = createQuestionMock({ id: "new", ...data });
      vi.spyOn(questionRepositoryMock, "create").mockResolvedValue(created);

      await questionService.createQuestion(new CreateQuestionRequestDto(data));

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "quiz:questions:q1",
      );
    });

    it("should throw QUESTION_CONFLICT if label already exists", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(questionRepositoryMock, "create").mockRejectedValue(error);

      await expect(
        questionService.createQuestion(
          new CreateQuestionRequestDto({
            label: "Existing",
            type: "multiple",
            order_index: 0,
            timer_seconds: 30,
            quiz_id: "q1",
          }),
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR if create fails", async () => {
      vi.spyOn(questionRepositoryMock, "create").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(
        questionService.createQuestion(
          new CreateQuestionRequestDto({
            label: "Error",
            type: "multiple",
            order_index: 0,
            timer_seconds: 30,
            quiz_id: "q1",
          }),
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("updateQuestion", () => {
    it("should invalidate cache on update", async () => {
      const question = createQuestionMock({
        id: "1",
        label: "Updated",
        quiz: createQuizMock({ id: "q1" }),
      });
      vi.spyOn(questionRepositoryMock, "update").mockResolvedValue(question);

      await questionService.updateQuestion("1", {
        label: "Updated",
        type: "multiple",
        order_index: 0,
        timer_seconds: 30,
      });

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("question:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "quiz:questions:q1",
      );
    });

    it("should throw QUESTION_NOT_FOUND if question to update exists", async () => {
      // @ts-ignore
      vi.spyOn(questionRepositoryMock, "update").mockResolvedValue(null);

      await expect(
        questionService.updateQuestion("99", {
          label: "Missing",
          type: "multiple",
          order_index: 0,
          timer_seconds: 30,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw QUESTION_CONFLICT if duplicate label", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(questionRepositoryMock, "update").mockRejectedValue(error);

      await expect(
        questionService.updateQuestion("1", {
          label: "Dup",
          type: "multiple",
          order_index: 0,
          timer_seconds: 30,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR on failure", async () => {
      vi.spyOn(questionRepositoryMock, "update").mockRejectedValue(
        new Error("Fail"),
      );

      await expect(
        questionService.updateQuestion("1", {
          label: "Error",
          type: "multiple",
          order_index: 0,
          timer_seconds: 30,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteQuestion", () => {
    it("should invalidate cache on delete", async () => {
      const question = createQuestionMock({
        id: "1",
        quiz: createQuizMock({ id: "q1" }),
      });
      vi.spyOn(questionRepositoryMock, "findOne").mockResolvedValue(question);
      vi.spyOn(questionRepositoryMock, "delete").mockResolvedValue(undefined);

      await questionService.deleteQuestion("1");

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("question:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "quiz:questions:q1",
      );
    });

    it("should succeed even if cache invalidation fails on delete", async () => {
      const question = createQuestionMock({ id: "1" });
      vi.spyOn(questionRepositoryMock, "findOne").mockResolvedValue(question);
      vi.spyOn(questionRepositoryMock, "delete").mockResolvedValue(undefined);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Cache Down"));

      await questionService.deleteQuestion("1");

      expect(questionRepositoryMock.delete).toHaveBeenCalledWith("1");
    });

    it("should throw DATABASE_ERROR if delete fails", async () => {
      vi.spyOn(questionRepositoryMock, "delete").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(questionService.deleteQuestion("1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
