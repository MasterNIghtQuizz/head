import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TypeOrmResponseRepository } from "./typeorm-response.repository.js";
import { ResponseMapper } from "../mappers/response.mapper.js";
import {
  createResponseEntity,
  createResponseModel,
} from "../../../../modules/response/tests/factories/response.factory.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("TypeOrmResponseRepository Unit Tests", () => {
  /** @type {TypeOrmResponseRepository} */
  let repository;

  /** @type {{ create: Mock, save: Mock, update: Mock, delete: Mock, findOne: Mock, find: Mock }} */
  let typeOrmRepoMock;

  /** @type {{ getRepository: Mock }} */
  let dataSourceMock;

  /** @type {{ get: Mock, set: Mock, del: Mock, delByPattern: Mock }} */
  let valkeyRepositoryMock;

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

    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    repository = new TypeOrmResponseRepository(
      /** @type {any} */ (dataSourceMock),
      /** @type {any} */ (valkeyRepositoryMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should map entity to persistence, save, and return domain entity", async () => {
      const entity = createResponseEntity();
      const model = createResponseModel();

      const spyToPersistence = vi.spyOn(ResponseMapper, "toPersistence");
      const spyToDomain = vi.spyOn(ResponseMapper, "toDomain");

      typeOrmRepoMock.create.mockReturnValue(model);
      typeOrmRepoMock.save.mockResolvedValue(model);

      const result = await repository.create(entity);

      expect(spyToPersistence).toHaveBeenCalledWith(entity);
      expect(typeOrmRepoMock.create).toHaveBeenCalled();
      expect(typeOrmRepoMock.save).toHaveBeenCalledWith(model);
      expect(spyToDomain).toHaveBeenCalledWith(model);
      expect(result).toBeDefined();
      expect(result.id).toBe(model.id);
    });
  });

  describe("update", () => {
    it("should call repo.update with mapped persistence data", async () => {
      const entity = createResponseEntity();

      const spyToPersistence = vi.spyOn(ResponseMapper, "toPersistence");

      await repository.update("resp-1", entity);

      expect(spyToPersistence).toHaveBeenCalledWith(entity);
      expect(typeOrmRepoMock.update).toHaveBeenCalledWith(
        "resp-1",
        expect.any(Object),
      );
    });
  });

  describe("findByParticipantAndQuestion", () => {
    it("should return domain entity when found", async () => {
      const model = createResponseModel();
      typeOrmRepoMock.findOne.mockResolvedValue(model);

      const result = await repository.findByParticipantAndQuestion(
        "participant-1",
        "question-1",
      );

      expect(typeOrmRepoMock.findOne).toHaveBeenCalledWith({
        where: {
          participant_id: "participant-1",
          question_id: "question-1",
        },
      });
      expect(result).toBeDefined();
      expect(result?.participantId).toBe(model.participant_id);
    });

    it("should return null when not found", async () => {
      typeOrmRepoMock.findOne.mockResolvedValue(null);

      const result = await repository.findByParticipantAndQuestion(
        "participant-1",
        "question-1",
      );

      expect(result).toBeNull();
    });
  });

  describe("findByParticipantAndSession", () => {
    it("should return array of domain entities", async () => {
      const models = [
        createResponseModel(),
        createResponseModel({ id: "id-2" }),
      ];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findByParticipantAndSession(
        "participant-1",
        "session-1",
      );

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: {
          participant_id: "participant-1",
          session_id: "session-1",
        },
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no results", async () => {
      typeOrmRepoMock.find.mockResolvedValue([]);

      const result = await repository.findByParticipantAndSession(
        "participant-1",
        "session-1",
      );

      expect(result).toEqual([]);
    });
  });

  describe("findByQuestionAndSession", () => {
    it("should return mapped domain entities", async () => {
      const models = [createResponseModel()];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findByQuestionAndSession(
        "question-1",
        "session-1",
      );

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: {
          question_id: "question-1",
          session_id: "session-1",
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findBySession", () => {
    it("should return all responses for a session", async () => {
      const models = [
        createResponseModel(),
        createResponseModel({ id: "id-2" }),
        createResponseModel({ id: "id-3" }),
      ];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findBySession("session-1");

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: { session_id: "session-1" },
      });
      expect(result).toHaveLength(3);
    });
  });

  describe("findByParticipant", () => {
    it("should return all responses for a participant", async () => {
      const models = [createResponseModel()];
      typeOrmRepoMock.find.mockResolvedValue(models);

      const result = await repository.findByParticipant("participant-1");

      expect(typeOrmRepoMock.find).toHaveBeenCalledWith({
        where: { participant_id: "participant-1" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("deleteBySessionId", () => {
    it("should call repo.delete with session_id", async () => {
      typeOrmRepoMock.delete.mockResolvedValue({ affected: 3 });

      await repository.deleteBySessionId("session-1");

      expect(typeOrmRepoMock.delete).toHaveBeenCalledWith({
        session_id: "session-1",
      });
    });
  });
});
