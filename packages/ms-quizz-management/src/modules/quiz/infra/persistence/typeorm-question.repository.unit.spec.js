import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmQuestionRepository } from "./typeorm-question.repository.js";
import {
  createQuestionEntity,
  createQuestionModel,
} from "../../../../tests/factories/quiz.factory.js";
import { QuestionMapper } from "../mappers/question.mapper.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("TypeOrmQuestionRepository Unit Tests", () => {
  /** @type {TypeOrmQuestionRepository} */
  let repository;

  /** @type {{ create: Mock, save: Mock, update: Mock, delete: Mock, findOne: Mock, find: Mock }} */
  let typeOrmRepoMock;

  /** @type {{ getRepository: Mock }} */
  let dataSourceMock;

  beforeEach(() => {
    typeOrmRepoMock = {
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
    };

    dataSourceMock = {
      getRepository: vi.fn().mockReturnValue(typeOrmRepoMock),
    };

    repository = new TypeOrmQuestionRepository(
      /** @type {any} */ (dataSourceMock),
      /** @type {import('common-valkey').ValkeyRepository} */ ({}),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create and return a question entity", async () => {
      const entity = createQuestionEntity();
      const model = createQuestionModel();
      const spyToPersistence = vi.spyOn(QuestionMapper, "toPersistence");
      const spyToDomain = vi.spyOn(QuestionMapper, "toDomain");

      typeOrmRepoMock.create.mockReturnValue(model);
      typeOrmRepoMock.save.mockResolvedValue(model);

      const result = await repository.create(entity);

      expect(spyToPersistence).toHaveBeenCalledWith(entity);
      expect(typeOrmRepoMock.create).toHaveBeenCalled();
      expect(typeOrmRepoMock.save).toHaveBeenCalled();
      expect(spyToDomain).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("update", () => {
    it("should update and return the updated question", async () => {
      const entity = createQuestionEntity();
      vi.spyOn(repository, "findOne").mockResolvedValue(entity);

      const result = await repository.update("q-1", entity);

      expect(typeOrmRepoMock.update).toHaveBeenCalled();
      expect(repository.findOne).toHaveBeenCalledWith("q-1");
      expect(result).toEqual(entity);
    });
  });

  describe("delete", () => {
    it("should delete the question", async () => {
      await repository.delete("q-1");
      expect(typeOrmRepoMock.delete).toHaveBeenCalledWith("q-1");
    });
  });

  describe("findOne", () => {
    it("should return entity if found with relations", async () => {
      const model = createQuestionModel();
      typeOrmRepoMock.findOne.mockResolvedValue(model);

      const result = await repository.findOne("q-1");

      expect(typeOrmRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: "q-1" },
        relations: ["quiz"],
      });
      expect(result).toBeDefined();
    });

    it("should return null if not found", async () => {
      typeOrmRepoMock.findOne.mockResolvedValue(null);
      const result = await repository.findOne("unknown");
      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all questions with relations", async () => {
      const models = [createQuestionModel()];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findAll();

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        relations: ["quiz"],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findByQuizId", () => {
    it("should return questions for a specific quiz", async () => {
      const models = [createQuestionModel({ quiz_id: "quiz-1" })];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findByQuizId("quiz-1");

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: { quiz_id: "quiz-1" },
        relations: ["quiz"],
      });
      expect(result).toHaveLength(1);
    });
  });
});
