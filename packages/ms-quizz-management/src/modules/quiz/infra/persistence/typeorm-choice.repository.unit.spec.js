import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmChoiceRepository } from "./typeorm-choice.repository.js";
import {
  createChoiceEntity,
  createChoiceModel,
} from "../../../../tests/factories/quiz.factory.js";
import { ChoiceMapper } from "../mappers/choice.mapper.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("TypeOrmChoiceRepository Unit Tests", () => {
  /** @type {TypeOrmChoiceRepository} */
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

    repository = new TypeOrmChoiceRepository(
      /** @type {any} */ (dataSourceMock),
      /** @type {import('common-valkey').ValkeyRepository} */ ({}),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create and return a choice entity", async () => {
      const entity = createChoiceEntity();
      const model = createChoiceModel();
      const spyToPersistence = vi.spyOn(ChoiceMapper, "toPersistence");
      const spyToDomain = vi.spyOn(ChoiceMapper, "toDomain");

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
    it("should update and return the updated choice", async () => {
      const entity = createChoiceEntity();
      vi.spyOn(repository, "findOne").mockResolvedValue(entity);

      const result = await repository.update("c-1", entity);

      expect(typeOrmRepoMock.update).toHaveBeenCalled();
      expect(repository.findOne).toHaveBeenCalledWith("c-1");
      expect(result).toEqual(entity);
    });
  });

  describe("delete", () => {
    it("should delete the choice", async () => {
      await repository.delete("c-1");
      expect(typeOrmRepoMock.delete).toHaveBeenCalledWith("c-1");
    });
  });

  describe("findOne", () => {
    it("should return entity if found with relations", async () => {
      const model = createChoiceModel();
      typeOrmRepoMock.findOne.mockResolvedValue(model);

      const result = await repository.findOne("c-1");

      expect(typeOrmRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: "c-1" },
        relations: ["question"],
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
    it("should return all choices with relations", async () => {
      const models = [createChoiceModel()];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findAll();

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        relations: ["question"],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findByQuestionId", () => {
    it("should return choices for a specific question", async () => {
      const models = [createChoiceModel({ question_id: "q-1" })];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findByQuestionId("q-1");

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: { question_id: "q-1" },
      });
      expect(result).toHaveLength(1);
    });
  });
});
