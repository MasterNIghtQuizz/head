import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChoiceService } from "./choice.service.js";
import {
  createChoiceEntity,
  createQuestionEntity,
} from "../../../tests/factories/quiz.factory.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("ChoiceService Unit Tests", () => {
  /** @type {ChoiceService} */
  let service;

  /** @type {{ findAll: Mock, findByQuestionId: Mock, findOne: Mock, create: Mock, update: Mock, delete: Mock, valkeyRepository: import('common-valkey').ValkeyRepository }} */
  let choiceRepositoryMock;

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

    choiceRepositoryMock = {
      findAll: vi.fn(),
      findByQuestionId: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    questionRepositoryMock = {
      findOne: vi.fn(),
      findAll: vi.fn(),
      findByQuizId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findByIdWithChildren: vi.fn(),
      delete: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    service = new ChoiceService(
      /** @type {import('../core/ports/choice.repository.js').IChoiceRepository} */ (
        choiceRepositoryMock
      ),
      /** @type {import('../core/ports/question.repository.js').IQuestionRepository} */ (
        questionRepositoryMock
      ),
      3600,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllChoices", () => {
    it("should return choices from cache", async () => {
      const cached = [{ id: "1" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const result = await service.getAllChoices();
      expect(result).toEqual(cached);
    });

    it("should fetch from DB if cache empty", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findAll.mockResolvedValue([createChoiceEntity()]);
      const result = await service.getAllChoices();
      expect(choiceRepositoryMock.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Fail"));
      choiceRepositoryMock.findAll.mockResolvedValue([createChoiceEntity()]);
      const result = await service.getAllChoices();
      expect(result).toHaveLength(1);
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findAll.mockResolvedValue([createChoiceEntity()]);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Fail"));
      const result = await service.getAllChoices();
      expect(result).toHaveLength(1);
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findAll.mockRejectedValue(new Error("Fail"));
      await expect(service.getAllChoices()).rejects.toThrow();
    });
  });

  describe("getChoicesByQuestionId", () => {
    it("should return choices for question from cache", async () => {
      const cached = [{ id: "1" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const result = await service.getChoicesByQuestionId("q-1");
      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "question:choices:q-1",
      );
      expect(result).toEqual(cached);
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Fail"));
      choiceRepositoryMock.findByQuestionId.mockResolvedValue([
        createChoiceEntity(),
      ]);
      const result = await service.getChoicesByQuestionId("q-1");
      expect(result).toHaveLength(1);
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findByQuestionId.mockResolvedValue([
        createChoiceEntity(),
      ]);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Fail"));
      const result = await service.getChoicesByQuestionId("q-1");
      expect(result).toHaveLength(1);
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findByQuestionId.mockRejectedValue(
        new Error("Fail"),
      );
      await expect(service.getChoicesByQuestionId("q-1")).rejects.toThrow();
    });
  });

  describe("getChoiceById", () => {
    it("should return choice from cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue({ id: "c-1" });
      const result = await service.getChoiceById("c-1");
      expect(result.id).toBe("c-1");
    });

    it("should throw NOT_FOUND if not in cache or DB", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.getChoiceById("unknown")).rejects.toThrow();
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Fail"));
      choiceRepositoryMock.findOne.mockResolvedValue(
        createChoiceEntity({ id: "c-1" }),
      );
      const result = await service.getChoiceById("c-1");
      expect(result.id).toBe("c-1");
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      choiceRepositoryMock.findOne.mockRejectedValue(new Error("Fail"));
      await expect(service.getChoiceById("c-1")).rejects.toThrow();
    });
  });

  describe("createChoice", () => {
    it("should create choice and invalidate caches", async () => {
      const dto = { text: "C", is_correct: true, question_id: "q-1" };
      const entity = createChoiceEntity({ id: "c-1", ...dto });
      choiceRepositoryMock.create.mockResolvedValue(entity);
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );

      const result = await service.createChoice(dto);

      expect(choiceRepositoryMock.create).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quiz:quiz-1");
      expect(result.id).toBe("c-1");
    });

    it("should create even if cache invalidation fails", async () => {
      const dto = { text: "C", is_correct: true, question_id: "q-1" };
      choiceRepositoryMock.create.mockResolvedValue(
        createChoiceEntity({ id: "c-1" }),
      );
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Fail"));
      const result = await service.createChoice(dto);
      expect(result.id).toBe("c-1");
    });

    it("should throw DATABASE_ERROR if repo fails", async () => {
      choiceRepositoryMock.create.mockRejectedValue(new Error("Fail"));
      await expect(
        service.createChoice({
          text: "C",
          is_correct: true,
          question_id: "q-1",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateChoice", () => {
    it("should update choice and invalidate caches", async () => {
      const entity = createChoiceEntity({ id: "c-1", questionId: "q-1" });
      choiceRepositoryMock.findOne.mockResolvedValue(entity);
      choiceRepositoryMock.update.mockResolvedValue(entity);
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );

      const result = await service.updateChoice("c-1", {
        text: "Updated",
        is_correct: true,
      });

      expect(choiceRepositoryMock.update).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choice:c-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(result.text).toBe("Updated");
    });

    it("should throw NOT_FOUND if choice does not exist on update", async () => {
      choiceRepositoryMock.findOne.mockResolvedValue(null);
      await expect(
        service.updateChoice("c-1", { text: "X", is_correct: true }),
      ).rejects.toThrow();
    });

    it("should update even if cache invalidation fails", async () => {
      const entity = createChoiceEntity({ id: "c-1", questionId: "q-1" });
      choiceRepositoryMock.findOne.mockResolvedValue(entity);
      choiceRepositoryMock.update.mockResolvedValue(entity);
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Fail"));
      const result = await service.updateChoice("c-1", {
        text: "Updated",
        is_correct: true,
      });
      expect(result.text).toBe("Updated");
    });

    it("should throw DATABASE_ERROR if repo update fails", async () => {
      choiceRepositoryMock.findOne.mockResolvedValue(
        createChoiceEntity({ id: "c-1" }),
      );
      choiceRepositoryMock.update.mockRejectedValue(new Error("Fail"));
      await expect(
        service.updateChoice("c-1", { text: "X", is_correct: true }),
      ).rejects.toThrow();
    });
  });

  describe("deleteChoice", () => {
    it("should delete choice and invalidate caches", async () => {
      const entity = createChoiceEntity({ id: "c-1", questionId: "q-1" });
      choiceRepositoryMock.findOne.mockResolvedValue(entity);
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );

      await service.deleteChoice("c-1");

      expect(choiceRepositoryMock.delete).toHaveBeenCalledWith("c-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choice:c-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "question:choices:q-1",
      );
    });

    it("should throw DB error if delete fails", async () => {
      choiceRepositoryMock.findOne.mockRejectedValue(new Error("Fail"));
      await expect(service.deleteChoice("1")).rejects.toThrow();
    });

    it("should complete delete even if cache fails", async () => {
      choiceRepositoryMock.findOne.mockResolvedValue(
        createChoiceEntity({ id: "1", questionId: "q-1" }),
      );
      questionRepositoryMock.findOne.mockResolvedValue(
        createQuestionEntity({ quizId: "quiz-1" }),
      );
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Fail"));
      await service.deleteChoice("1");
      expect(choiceRepositoryMock.delete).toHaveBeenCalledWith("1");
    });
  });
});
