import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizService } from "./quiz.service.js";
import {
  createQuizEntity,
  createQuestionEntity,
  createChoiceEntity,
} from "../../../tests/factories/quiz.factory.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("QuizService Unit Tests", () => {
  /** @type {QuizService} */
  let service;

  /** @type {{ findAll: Mock, findOne: Mock, create: Mock, update: Mock, delete: Mock, findByIdWithChildren: Mock, valkeyRepository: any }} */
  let quizRepositoryMock;

  /** @type {{ get: Mock, set: Mock, del: Mock, delByPattern: Mock }} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    quizRepositoryMock = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByIdWithChildren: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    service = new QuizService(
      /** @type {import('../core/ports/quiz.repository.js').IQuizRepository} */ (
        quizRepositoryMock
      ),
      3600,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllQuizzes", () => {
    it("should return quizzes from cache if available", async () => {
      const cached = [{ id: "1", title: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);

      const result = await service.getAllQuizzes();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("quizzes:all");
      expect(result).toEqual(cached);
      expect(quizRepositoryMock.findAll).not.toHaveBeenCalled();
    });

    it("should fetch from repository if cache is empty", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entities = [createQuizEntity()];
      quizRepositoryMock.findAll.mockResolvedValue(entities);

      const result = await service.getAllQuizzes();

      expect(quizRepositoryMock.findAll).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should throw database error if repository fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizRepositoryMock.findAll.mockRejectedValue(new Error("DB Fail"));

      await expect(service.getAllQuizzes()).rejects.toThrow();
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Fail"));
      const entities = [createQuizEntity()];
      quizRepositoryMock.findAll.mockResolvedValue(entities);

      const result = await service.getAllQuizzes();

      expect(quizRepositoryMock.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizRepositoryMock.findAll.mockResolvedValue([createQuizEntity()]);
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Cache Set Fail"));

      const result = await service.getAllQuizzes();

      expect(result).toHaveLength(1);
    });
  });

  describe("getQuizById", () => {
    it("should return quiz from cache", async () => {
      const cached = { id: "1" };
      valkeyRepositoryMock.get.mockResolvedValue(cached);

      const result = await service.getQuizById("1");

      expect(result).toEqual(cached);
    });

    it("should return quiz from repository if not in cache", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entity = createQuizEntity({ id: "1" });
      quizRepositoryMock.findOne.mockResolvedValue(entity);

      const result = await service.getQuizById("1");

      expect(quizRepositoryMock.findOne).toHaveBeenCalledWith("1");
      expect(result.id).toBe("1");
    });

    it("should throw NOT_FOUND if quiz does not exist", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.getQuizById("unknown")).rejects.toThrow();
    });

    it("should fallback to DB if cache get fails", async () => {
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Fail"));
      const entity = createQuizEntity({ id: "1" });
      quizRepositoryMock.findOne.mockResolvedValue(entity);

      const result = await service.getQuizById("1");

      expect(quizRepositoryMock.findOne).toHaveBeenCalledWith("1");
      expect(result.id).toBe("1");
    });

    it("should return result even if cache set fails", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizRepositoryMock.findOne.mockResolvedValue(
        createQuizEntity({ id: "1" }),
      );
      valkeyRepositoryMock.set.mockRejectedValue(new Error("Cache Set Fail"));

      const result = await service.getQuizById("1");

      expect(result.id).toBe("1");
    });

    it("should throw DATABASE_ERROR if repo throws unknown error", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      quizRepositoryMock.findOne.mockRejectedValue(new Error("Unknown Error"));

      await expect(service.getQuizById("1")).rejects.toThrow();
    });
  });

  describe("createQuiz", () => {
    it("should create a quiz and invalidate cache", async () => {
      const dto = { title: "New Quiz", description: "Desc" };
      const entity = createQuizEntity({ id: "new-id", ...dto });
      quizRepositoryMock.create.mockResolvedValue(entity);

      const result = await service.createQuiz(dto);

      expect(quizRepositoryMock.create).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(result.id).toBe("new-id");
    });

    it("should throw CONFLICT if title exists", async () => {
      const error = new Error("Conflict");
      /** @type {any} */ (error).code = "23505";
      quizRepositoryMock.create.mockRejectedValue(error);

      await expect(
        service.createQuiz({
          title: "Taken",
          description: undefined,
        }),
      ).rejects.toThrow();
    });

    it("should complete creation even if cache invalidation fails", async () => {
      const dto = { title: "New", description: "Desc" };
      quizRepositoryMock.create.mockResolvedValue(
        createQuizEntity({ id: "1" }),
      );
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Del Fail"));

      const result = await service.createQuiz(dto);

      expect(result.id).toBe("1");
    });

    it("should throw database error if repo fails", async () => {
      quizRepositoryMock.create.mockRejectedValue(new Error("Repo Fail"));
      await expect(
        service.createQuiz({ title: "X", description: "" }),
      ).rejects.toThrow();
    });
  });

  describe("updateQuiz", () => {
    it("should update quiz and invalidate cache", async () => {
      const entity = createQuizEntity({ id: "1" });
      quizRepositoryMock.findOne.mockResolvedValue(entity);
      quizRepositoryMock.update.mockResolvedValue(entity);

      const result = await service.updateQuiz("1", {
        title: "Updated",
        description: undefined,
      });

      expect(quizRepositoryMock.update).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quiz:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(result.title).toBe("Updated");
    });

    it("should throw NOT_FOUND if quiz does not exist on update", async () => {
      quizRepositoryMock.findOne.mockResolvedValue(null);
      await expect(
        service.updateQuiz("1", { title: "X", description: "" }),
      ).rejects.toThrow();
    });

    it("should throw CONFLICT on unique constraint violation during update", async () => {
      quizRepositoryMock.findOne.mockResolvedValue(
        createQuizEntity({ id: "1" }),
      );
      const error = new Error("Conflict");
      /** @type {any} */ (error).code = "23505";
      quizRepositoryMock.update.mockRejectedValue(error);

      await expect(
        service.updateQuiz("1", { title: "Taken", description: "" }),
      ).rejects.toThrow();
    });

    it("should throw DATABASE_ERROR if repo update fails with other error", async () => {
      quizRepositoryMock.findOne.mockResolvedValue(
        createQuizEntity({ id: "1" }),
      );
      quizRepositoryMock.update.mockRejectedValue(new Error("Update Fail"));

      await expect(
        service.updateQuiz("1", { title: "X", description: "" }),
      ).rejects.toThrow();
    });

    it("should complete update even if cache invalidation fails", async () => {
      const entity = createQuizEntity({ id: "1" });
      quizRepositoryMock.findOne.mockResolvedValue(entity);
      quizRepositoryMock.update.mockResolvedValue(entity);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Del Fail"));

      const result = await service.updateQuiz("1", {
        title: "Updated",
        description: "",
      });
      expect(result.id).toBe("1");
    });
  });

  describe("deleteQuiz", () => {
    it("should delete quiz and all related cache", async () => {
      const entity = createQuizEntity({ id: "1", questions: [] });
      quizRepositoryMock.findByIdWithChildren.mockResolvedValue(entity);

      await service.deleteQuiz("1");

      expect(quizRepositoryMock.delete).toHaveBeenCalledWith("1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quiz:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("quizzes:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("questions:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
    });

    it("should delete even if quiz has no questions", async () => {
      quizRepositoryMock.findByIdWithChildren.mockResolvedValue(
        createQuizEntity({ id: "1", questions: undefined }),
      );
      await service.deleteQuiz("1");
      expect(quizRepositoryMock.delete).toHaveBeenCalledWith("1");
    });

    it("should delete quiz and questions and choices correctly", async () => {
      const entity = createQuizEntity({
        id: "1",
        questions: [
          {
            id: "q-1",
            choices: [createChoiceEntity({ id: "c-1", questionId: "q-1" })],
            label: "",
            type: "",
            order_index: 0,
            timer_seconds: 0,
            quizId: undefined,
            update: function (data) {
              throw new Error("Function not implemented.");
            },
          },
        ],
      });
      quizRepositoryMock.findByIdWithChildren.mockResolvedValue(entity);

      await service.deleteQuiz("1");

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choice:c-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("question:q-1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "question:choices:q-1",
      );
    });

    it("should throw DB error if delete fails", async () => {
      quizRepositoryMock.findByIdWithChildren.mockRejectedValue(
        new Error("Fail"),
      );
      await expect(service.deleteQuiz("1")).rejects.toThrow();
    });
  });
});
