import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmSessionRepository } from "./typeorm-session.repository.js";
import {
  createSessionEntity,
  createSessionModel,
} from "../../services/test-helpers.js";
import { SessionMapper } from "../mappers/session.mapper.js";

/**
 * @typedef {import('vitest').Mocked<import('typeorm').Repository<import('../models/session.model.js').SessionModel>>} TypeOrmRepoMock
 * @typedef {import('vitest').Mocked<import('typeorm').DataSource>} DataSourceMock
 */

describe("TypeOrmSessionRepository unit tests", () => {
  /** @type {import('./typeorm-session.repository.js').TypeOrmSessionRepository} */
  let repository;
  /** @type {DataSourceMock} */
  let dataSourceMock;
  /** @type {TypeOrmRepoMock} */
  let typeOrmRepoMock;

  beforeEach(() => {
    // @ts-ignore
    typeOrmRepoMock = /** @type {TypeOrmRepoMock} */ ({
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOne: vi.fn(),
      findOneBy: vi.fn(),
    });

    // @ts-ignore
    dataSourceMock = /** @type {DataSourceMock} */ ({
      getRepository: vi.fn().mockReturnValue(typeOrmRepoMock),
    });

    // @ts-ignore
    const valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    repository = new TypeOrmSessionRepository(
      dataSourceMock,
      // @ts-ignore
      valkeyRepositoryMock,
    );
    // @ts-ignore
    repository.valkeyRepository = valkeyRepositoryMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should map entity to model, save it, and map back to entity", async () => {
      // @ts-ignore
      const entity = createSessionEntity({ id: null });
      const model = createSessionModel({ id: "generated-uuid" });

      const toModelSpy = vi
        .spyOn(SessionMapper, "toModel")
        .mockReturnValue(model);
      const createSpy = vi
        .mocked(typeOrmRepoMock.create)
        .mockReturnValue(model);
      const saveSpy = vi.mocked(typeOrmRepoMock.save).mockResolvedValue(model);
      const toEntitySpy = vi
        .spyOn(SessionMapper, "toEntity")
        .mockReturnValue(createSessionEntity({ id: "generated-uuid" }));

      const result = await repository.create(entity);

      expect(toModelSpy).toHaveBeenCalledWith(entity);
      expect(createSpy).toHaveBeenCalledWith(model);
      expect(saveSpy).toHaveBeenCalledWith(model);
      expect(toEntitySpy).toHaveBeenCalledWith(model);
      expect(result.id).toBe("generated-uuid");
    });
  });

  describe("find", () => {
    it("should return entity if session is found", async () => {
      const id = "session-123";
      const model = createSessionModel({ id });
      const entity = createSessionEntity({ id });

      const findOneSpy = vi
        .mocked(typeOrmRepoMock.findOne)
        .mockResolvedValue(model);
      const toEntitySpy = vi
        .spyOn(SessionMapper, "toEntity")
        .mockReturnValue(entity);

      const result = await repository.find(id);

      expect(findOneSpy).toHaveBeenCalledWith({ where: { id } });
      expect(toEntitySpy).toHaveBeenCalledWith(model);
      expect(result).toEqual(entity);
    });

    it("should return null if session is not found", async () => {
      vi.mocked(typeOrmRepoMock.findOne).mockResolvedValue(null);
      const result = await repository.find("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("findByPublicKey", () => {
    it("should query by public_key", async () => {
      const publicKey = "pub-123";
      const model = createSessionModel({ public_key: publicKey });
      vi.mocked(typeOrmRepoMock.findOneBy).mockResolvedValue(model);
      vi.spyOn(SessionMapper, "toEntity").mockReturnValue(
        createSessionEntity({ publicKey }),
      );

      const result = await repository.findByPublicKey(publicKey);

      expect(typeOrmRepoMock.findOneBy).toHaveBeenCalledWith({
        public_key: publicKey,
      });
      expect(result?.publicKey).toBe(publicKey);
    });
  });

  describe("update", () => {
    it("should update model using id", async () => {
      const id = "session-123";
      const entity = createSessionEntity({ id });
      const modelData = createSessionModel({ id });
      vi.spyOn(SessionMapper, "toModel").mockReturnValue(modelData);

      await repository.update(id, entity);

      expect(typeOrmRepoMock.update).toHaveBeenCalledWith(id, modelData);
    });
  });

  describe("delete", () => {
    it("should call typeorm delete", async () => {
      const id = "session-123";
      await repository.delete(id);
      expect(typeOrmRepoMock.delete).toHaveBeenCalledWith(id);
    });
  });
});
