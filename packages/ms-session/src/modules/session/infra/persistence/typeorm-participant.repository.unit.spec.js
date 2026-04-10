import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmParticipantRepository } from "./typeorm-participant.repository.js";
import {
  createParticipantEntity,
  createParticipantModel,
} from "../../services/test-helpers.js";
import { ParticipantMapper } from "../mappers/participant.mapper.js";

/**
 * @typedef {import('vitest').Mocked<import('typeorm').Repository<import('../models/participant.model.js').ParticipantModel>>} TypeOrmRepoMock
 * @typedef {import('vitest').Mocked<import('typeorm').DataSource>} DataSourceMock
 */

describe("TypeOrmParticipantRepository unit tests", () => {
  /** @type {import('./typeorm-participant.repository.js').TypeOrmParticipantRepository} */
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
      findOneBy: vi.fn(),
      findBy: vi.fn(),
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

    repository = new TypeOrmParticipantRepository(
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
      const entity = createParticipantEntity({ id: null });
      const model = createParticipantModel({ id: "gen-uuid" });

      const toModelSpy = vi
        .spyOn(ParticipantMapper, "toModel")
        .mockReturnValue(model);
      const createSpy = vi
        .mocked(typeOrmRepoMock.create)
        .mockReturnValue(model);
      const saveSpy = vi.mocked(typeOrmRepoMock.save).mockResolvedValue(model);
      const toEntitySpy = vi
        .spyOn(ParticipantMapper, "toEntity")
        .mockReturnValue(createParticipantEntity({ id: "gen-uuid" }));

      const result = await repository.create(entity);

      expect(toModelSpy).toHaveBeenCalledWith(entity);
      expect(createSpy).toHaveBeenCalledWith(model);
      expect(saveSpy).toHaveBeenCalledWith(model);
      expect(toEntitySpy).toHaveBeenCalledWith(model);
      expect(result.id).toBe("gen-uuid");
    });
  });

  describe("find", () => {
    it("should return participant by id", async () => {
      const id = "part-123";
      const model = createParticipantModel({ id });
      const entity = createParticipantEntity({ id });

      vi.mocked(typeOrmRepoMock.findOneBy).mockResolvedValue(model);
      vi.spyOn(ParticipantMapper, "toEntity").mockReturnValue(entity);

      const result = await repository.find(id);

      expect(typeOrmRepoMock.findOneBy).toHaveBeenCalledWith({ id });
      expect(result).toEqual(entity);
    });
  });

  describe("findBySessionId", () => {
    it("should return all participants for a session", async () => {
      const sessionId = "session-123";
      const models = [
        createParticipantModel({ id: "p1" }),
        createParticipantModel({ id: "p2" }),
      ];

      vi.mocked(typeOrmRepoMock.findBy).mockResolvedValue(models);
      const toEntitySpy = vi.spyOn(ParticipantMapper, "toEntity");

      const result = await repository.findBySessionId(sessionId);

      expect(typeOrmRepoMock.findBy).toHaveBeenCalledWith({
        session_id: sessionId,
      });
      expect(toEntitySpy).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });
});
