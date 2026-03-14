import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmQuizRepository } from "./typeorm-quiz.repository.js";
import {
  createQuizEntity,
  createQuizModel,
} from "../../../../tests/factories/quiz.factory.js";
import { QuizMapper } from "../mappers/quiz.mapper.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("TypeOrmQuizRepository Unit Tests", () => {
  /** @type {TypeOrmQuizRepository} */
  let repository;

  /** @type {{ create: Mock, save: Mock, update: Mock, delete: Mock, findOneBy: Mock, find: Mock, findOne: Mock }} */
  let typeOrmRepoMock;

  /** @type {{ getRepository: Mock }} */
  let dataSourceMock;

  beforeEach(() => {
    typeOrmRepoMock = {
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOneBy: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    dataSourceMock = {
      getRepository: vi.fn().mockReturnValue(typeOrmRepoMock),
    };

    repository = new TypeOrmQuizRepository(
      /** @type {any} */ (dataSourceMock),
      /** @type {import('common-valkey').ValkeyRepository} */ ({}),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create and return a quiz entity", async () => {
      const entity = createQuizEntity();
      const model = createQuizModel();
      const spyToPersistence = vi.spyOn(QuizMapper, "toPersistence");
      const spyToDomain = vi.spyOn(QuizMapper, "toDomain");

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
    it("should update and return the updated quiz", async () => {
      const entity = createQuizEntity();
      vi.spyOn(repository, "findOne").mockResolvedValue(entity);

      const result = await repository.update("quiz-1", entity);

      expect(typeOrmRepoMock.update).toHaveBeenCalledWith(
        "quiz-1",
        expect.any(Object),
      );
      expect(repository.findOne).toHaveBeenCalledWith("quiz-1");
      expect(result).toEqual(entity);
    });
  });

  describe("delete", () => {
    it("should delete the quiz", async () => {
      await repository.delete("quiz-1");
      expect(typeOrmRepoMock.delete).toHaveBeenCalledWith("quiz-1");
    });
  });

  describe("findOne", () => {
    it("should return entity if found", async () => {
      const model = createQuizModel();
      typeOrmRepoMock.findOneBy.mockResolvedValue(model);

      const result = await repository.findOne("quiz-1");

      expect(typeOrmRepoMock.findOneBy).toHaveBeenCalledWith({ id: "quiz-1" });
      expect(result).toBeDefined();
    });

    it("should return null if not found", async () => {
      typeOrmRepoMock.findOneBy.mockResolvedValue(null);
      const result = await repository.findOne("unknown");
      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return an array of entities", async () => {
      const models = [createQuizModel()];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findAll();

      expect(typeOrmRepoMock.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("findByIdWithChildren", () => {
    it("should return quiz with relations", async () => {
      const model = createQuizModel();
      typeOrmRepoMock.findOne.mockResolvedValue(model);

      const result = await repository.findByIdWithChildren("quiz-1");

      expect(typeOrmRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: "quiz-1" },
        relations: ["questions", "questions.choices"],
      });
      expect(result).toBeDefined();
    });
  });
});
