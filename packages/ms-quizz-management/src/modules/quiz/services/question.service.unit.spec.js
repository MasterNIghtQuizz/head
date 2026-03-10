import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuestionService } from "./question.service.js";
import { QuestionRepository } from "../repositories/question.repository.js";
import { createQuestionMock } from "../../../tests/factories/question.factory.js";
import { CreateQuestionRequestDto } from "../contracts/question.dto.js";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @typedef {import('../models/question.model.js').Question} Question
 * @typedef {import('vitest').Mocked<QuestionRepository>} QuestionRepositoryMock
 */

describe("QuestionService Unit Tests", () => {
  /** @type {QuestionService} */
  let questionService;

  /** @type {QuestionRepositoryMock} */
  let questionRepositoryMock;

  beforeEach(() => {
    questionRepositoryMock = /** @type {QuestionRepositoryMock} */ (
      Object.create(QuestionRepository.prototype)
    );
    questionService = new QuestionService(questionRepositoryMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuestions", () => {
    it("should return all questions", async () => {
      const questions = [createQuestionMock({ id: "1" })];
      const spy = vi
        .spyOn(questionRepositoryMock, "findAll")
        .mockResolvedValue(questions);

      const result = await questionService.getAllQuestions();

      expect(spy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
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
    it("should return a question by id", async () => {
      const question = createQuestionMock({ id: "1" });
      const spy = vi
        .spyOn(questionRepositoryMock, "findOne")
        .mockResolvedValue(question);

      const result = await questionService.getQuestionById("1");

      expect(spy).toHaveBeenCalledWith("1");
      expect(result.id).toBe("1");
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
    it("should return questions by quiz id", async () => {
      const questions = [createQuestionMock({ id: "1" })];
      const spy = vi
        .spyOn(questionRepositoryMock, "findByQuizId")
        .mockResolvedValue(questions);

      const result = await questionService.getQuestionsByQuizId("quiz-1");

      expect(spy).toHaveBeenCalledWith("quiz-1");
      expect(result).toHaveLength(1);
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
    it("should create and return a question", async () => {
      const data = {
        label: "Test?",
        type: "multiple",
        order_index: 0,
        timer_seconds: 30,
        quiz_id: "q1",
      };
      const created = createQuestionMock({ id: "new", ...data });
      const spy = vi
        .spyOn(questionRepositoryMock, "create")
        .mockResolvedValue(created);

      const result = await questionService.createQuestion(
        new CreateQuestionRequestDto(data),
      );

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ label: "Test?" }),
      );
      expect(result.id).toBe("new");
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
    it("should update and return a question", async () => {
      const question = createQuestionMock({ id: "1", label: "Updated" });
      const spy = vi
        .spyOn(questionRepositoryMock, "update")
        .mockResolvedValue(question);

      const result = await questionService.updateQuestion("1", {
        label: "Updated",
        type: undefined,
        order_index: undefined,
        timer_seconds: undefined,
      });

      expect(spy).toHaveBeenCalledWith("1", { label: "Updated" });
      expect(result.label).toBe("Updated");
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
    it("should call delete on repository", async () => {
      const spy = vi
        .spyOn(questionRepositoryMock, "delete")
        .mockResolvedValue(undefined);

      await questionService.deleteQuestion("1");

      expect(spy).toHaveBeenCalledWith("1");
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
