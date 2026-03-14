import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuestionService } from "./question.service.js";
import { createQuestionEntity } from "../../../tests/factories/quiz.factory.js";
import { QuestionMapper } from "../infra/mappers/question.mapper.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("QuestionService Unit Tests", () => {
  /** @type {QuestionService} */
  let service;

  /** @type {{ findAll: Mock, findByQuizId: Mock, findOne: Mock, create: Mock, update: Mock, delete: Mock, findByIdWithChildren: Mock, valkeyRepository: any }} */
  let questionRepositoryMock;

  /** @type {{ get: Mock, set: Mock, del: Mock, delByPattern: Mock }} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    questionRepositoryMock = {
      findAll: vi.fn(),
      findByQuizId: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByIdWithChildren: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    service = new QuestionService(
      /** @type {import('../core/ports/question.repository.js').IQuestionRepository} */ (
        questionRepositoryMock
      ),
      3600,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuestions", () => {
    it("should return questions from cache if available", async () => {
      const cached = [{ id: "1", label: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);

      const result = await service.getAllQuestions();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("questions:all");
      expect(result).toEqual(cached);
    });

    it("should fetch from DB and cache if not in cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entities = [createQuestionEntity()];
      questionRepositoryMock.findAll.mockResolvedValue(entities);

      const result = await service.getAllQuestions();

      expect(questionRepositoryMock.findAll).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Fail"));
      questionRepositoryMock.findAll.mockResolvedValue([
        createQuestionEntity(),
      ]);
      const result = await service.getAllQuestions();
      expect(result).toHaveLength(1);
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findAll.mockResolvedValue([
        createQuestionEntity(),
      ]);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Cache Set Fail"));
      const result = await service.getAllQuestions();
      expect(result).toHaveLength(1);
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findAll.mockRejectedValue(new Error("DB Fail"));
      await expect(service.getAllQuestions()).rejects.toThrow();
    });
  });

  describe("getQuestionsByQuizId", () => {
    it("should return questions for a quiz from cache", async () => {
      const cached = [{ id: "1" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);

      const result = await service.getQuestionsByQuizId("quiz-1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "quiz:questions:quiz-1",
      );
      expect(result).toEqual(cached);
    });

    it("should fetch from DB if not in cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entities = [createQuestionEntity()];
      questionRepositoryMock.findByQuizId.mockResolvedValue(entities);

      const result = await service.getQuestionsByQuizId("quiz-1");

      expect(questionRepositoryMock.findByQuizId).toHaveBeenCalledWith(
        "quiz-1",
      );
      expect(result).toHaveLength(1);
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Fail"));
      questionRepositoryMock.findByQuizId.mockResolvedValue([
        createQuestionEntity(),
      ]);
      const result = await service.getQuestionsByQuizId("quiz-1");
      expect(result).toHaveLength(1);
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findByQuizId.mockResolvedValue([
        createQuestionEntity(),
      ]);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Cache Set Fail"));
      const result = await service.getQuestionsByQuizId("quiz-1");
      expect(result).toHaveLength(1);
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findByQuizId.mockRejectedValue(
        new Error("DB Fail"),
      );
      await expect(service.getQuestionsByQuizId("quiz-1")).rejects.toThrow();
    });
  });

  describe("getQuestionById", () => {
    it("should return question from cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue({ id: "1" });
      const result = await service.getQuestionById("1");
      expect(result).toEqual({ id: "1" });
    });

    it("should return from DB and throw NOT_FOUND if empty", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.getQuestionById("unknown")).rejects.toThrow();
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Fail"));
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ id: "1" }),
      );
      const result = await service.getQuestionById("1");
      expect(result.id).toBe("1");
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      questionRepositoryMock.findOne.mockRejectedValue(new Error("Fail"));
      await expect(service.getQuestionById("1")).rejects.toThrow();
    });
  });

  describe("createQuestion", () => {
    it("should create question and invalidate relevant caches", async () => {
      const dto = {
        label: "Q",
        type: "T",
        order_index: 1,
        timer_seconds: 30,
        quiz_id: "quiz-1",
      };
      const entity = createQuestionEntity({ id: "q-1", ...dto });
      questionRepositoryMock.create.mockResolvedValue(entity);

      const result = await service.createQuestion(dto);

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "quiz:questions:quiz-1",
      );
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quiz:quiz-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(result.id).toBe("q-1");
    });

    it("should create even if cache invalidation fails", async () => {
      const dto = {
        label: "Q",
        type: "T",
        order_index: 1,
        timer_seconds: 30,
        quiz_id: "quiz-1",
      };
      questionRepositoryMock.create.mockResolvedValue(
        createQuestionEntity({ id: "q-1" }),
      );
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Fail"));
      const result = await service.createQuestion(dto);
      expect(result.id).toBe("q-1");
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      const dto = {
        label: "Q",
        type: "T",
        order_index: 1,
        timer_seconds: 30,
        quiz_id: "quiz-1",
      };
      questionRepositoryMock.create.mockRejectedValue(new Error("Fail"));
      await expect(service.createQuestion(dto)).rejects.toThrow();
    });
  });

  describe("updateQuestion", () => {
    it("should update question and invalidate cache", async () => {
      const entity = createQuestionEntity({ id: "q-1", quizId: "quiz-1" });
      questionRepositoryMock.findOne.mockResolvedValue(entity);
      questionRepositoryMock.update.mockResolvedValue(entity);

      const result = await service.updateQuestion("q-1", {
        label: "New",
        type: undefined,
        order_index: undefined,
        timer_seconds: undefined,
      });

      expect(questionRepositoryMock.update).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("question:q-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(result.label).toBe("New");
    });

    it("should throw NOT_FOUND if question does not exist on update", async () => {
      questionRepositoryMock.findOne.mockResolvedValue(null);
      await expect(
        service.updateQuestion("1", {
          label: "X",
          type: "T",
          order_index: 0,
          timer_seconds: 0,
        }),
      ).rejects.toThrow();
    });

    it("should update even if cache invalidation fails", async () => {
      const entity = createQuestionEntity({ id: "q-1" });
      questionRepositoryMock.findOne.mockResolvedValue(entity);
      questionRepositoryMock.update.mockResolvedValue(entity);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Fail"));
      const result = await service.updateQuestion("q-1", {
        label: "New",
        type: "T",
        order_index: 0,
        timer_seconds: 0,
      });
      expect(result.label).toBe("New");
    });

    it("should throw DATABASE_ERROR if repo update fails", async () => {
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ id: "q-1" }),
      );
      questionRepositoryMock.update.mockRejectedValue(new Error("Fail"));
      await expect(
        service.updateQuestion("q-1", {
          label: "X",
          type: "T",
          order_index: 0,
          timer_seconds: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe("deleteQuestion", () => {
    const questionId = "q-1";
    const quizId = "quiz-1";
    const choiceId = "c-1";
    beforeEach(() => {
      valkeyRepositoryMock.del.mockClear();
      questionRepositoryMock.delete.mockClear();
      questionRepositoryMock.findByIdWithChildren.mockClear();
      valkeyRepositoryMock.del.mockResolvedValue(undefined);
    });

    it("should delete question and invalidate all related caches (including choices)", async () => {
      const entity = createQuestionEntity({
        id: questionId,
        quizId: quizId,
      });
      entity.choices = [
        {
          id: choiceId,
          text: "",
          is_correct: false,
          questionId: undefined,
          update: function (_data) {
            throw new Error("Function not implemented.");
          },
        },
      ];

      questionRepositoryMock.findByIdWithChildren.mockResolvedValue(entity);
      questionRepositoryMock.delete.mockResolvedValue(undefined);

      await service.deleteQuestion(questionId);

      expect(questionRepositoryMock.findByIdWithChildren).toHaveBeenCalledWith(
        questionId,
      );
      expect(questionRepositoryMock.delete).toHaveBeenCalledWith(questionId);

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        `question:${questionId}`,
      );
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        `quiz:questions:${quizId}`,
      );
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(`quiz:${quizId}`);

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        `choice:${choiceId}`,
      );
    });

    it("should throw NOT_FOUND if question does not exist", async () => {
      questionRepositoryMock.findByIdWithChildren.mockResolvedValue(null);

      await expect(service.deleteQuestion("unknown")).rejects.toThrow();
      expect(questionRepositoryMock.delete).not.toHaveBeenCalled();
    });

    it("should complete delete even if cache invalidation fails", async () => {
      const entity = createQuestionEntity({ id: questionId });
      entity.choices = [];
      questionRepositoryMock.findByIdWithChildren.mockResolvedValue(entity);
      questionRepositoryMock.delete.mockResolvedValue(undefined);

      valkeyRepositoryMock.del.mockRejectedValue(new Error("Redis Down"));

      await expect(service.deleteQuestion(questionId)).resolves.not.toThrow();

      expect(questionRepositoryMock.delete).toHaveBeenCalledWith(questionId);
    });

    it("should throw DATABASE_ERROR if repository fails", async () => {
      questionRepositoryMock.findByIdWithChildren.mockRejectedValue(
        new Error("DB Connection Lost"),
      );

      await expect(service.deleteQuestion(questionId)).rejects.toThrow();
    });
  });
});
