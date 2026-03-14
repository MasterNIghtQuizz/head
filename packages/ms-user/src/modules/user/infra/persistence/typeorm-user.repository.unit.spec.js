import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmUserRepository } from "./typeorm-user.repository.js";
import {
  createUserEntityMock,
  createUserModelMock,
} from "../../../../tests/factories/user.factory.js";
import { UserMapper } from "../mappers/user.mapper.js";

/**
 * @typedef {import('vitest').Mocked<import('typeorm').Repository<import('../models/user.model.js').UserModel>>} TypeOrmRepoMock
 * @typedef {import('vitest').Mocked<import('typeorm').DataSource>} DataSourceMock
 * @typedef {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} ValkeyRepositoryMock
 */
vi.mock("common-crypto", () => ({
  CryptoService: {
    encrypt: vi.fn((val) => `encrypted-${val}`),
    decrypt: vi.fn((val) => val.replace("encrypted-", "")),
    hashPassword: vi.fn(() => Promise.resolve("hashed-password")),
    comparePassword: vi.fn(() => Promise.resolve(true)),
    sha256Hash: vi.fn((val) => `hash-${val}`),
    sign: vi.fn((val) => `signed-${val}`),
    // @ts-ignore
    verify: vi.fn((val) => ({ userId: "1", type: "REFRESH" })),
  },
}));

vi.mock("common-logger", () => {
  const loggerMock = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
  return {
    logger: loggerMock,
    default: loggerMock,
  };
});

describe("TypeOrmUserRepository Unit Tests", () => {
  /** @type {TypeOrmUserRepository} */
  let repository;

  /** @type {TypeOrmRepoMock} */
  let typeOrmRepoMock;

  /** @type {DataSourceMock} */
  let dataSourceMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  const encryptionKey = "test-encryption-key";

  beforeEach(() => {
    // @ts-ignore
    typeOrmRepoMock = /** @type {TypeOrmRepoMock} */ ({
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOneBy: vi.fn(),
      find: vi.fn(),
    });

    // @ts-ignore
    dataSourceMock = /** @type {DataSourceMock} */ ({
      getRepository: vi.fn().mockReturnValue(typeOrmRepoMock),
    });

    // @ts-ignore
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    });

    repository = new TypeOrmUserRepository(
      /** @type {DataSourceMock} */ (dataSourceMock),
      /** @type {ValkeyRepositoryMock} */ (valkeyRepositoryMock),
      encryptionKey,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should map entity to model, save it, and map back to domain", async () => {
      const entity = createUserEntityMock({ email: "test@example.com" });
      const model = createUserModelMock({
        email: "encrypted-test@example.com",
      });

      typeOrmRepoMock.create.mockReturnValue(model);
      typeOrmRepoMock.save.mockResolvedValue(model);

      const result = await repository.create(entity);

      expect(typeOrmRepoMock.create).toHaveBeenCalled();
      expect(typeOrmRepoMock.save).toHaveBeenCalledWith(model);
      expect(result.email).toEqual(entity.email);
      expect(result.id).toEqual(entity.id);
      expect(result.role).toEqual(entity.role);
    });
  });

  describe("findOne", () => {
    it("should return domain entity if model found", async () => {
      const model = createUserModelMock({ id: "1", email: "encrypted-email" });
      typeOrmRepoMock.findOneBy.mockResolvedValue(model);

      const result = await repository.findOne("1");

      expect(typeOrmRepoMock.findOneBy).toHaveBeenCalledWith({ id: "1" });
      expect(result?.id).toBe("1");
      expect(result?.email).toBe(
        UserMapper.toDomain(model, encryptionKey).email,
      );
    });

    it("should return null if model not found", async () => {
      typeOrmRepoMock.findOneBy.mockResolvedValue(null);
      const result = await repository.findOne("unknown");
      expect(result).toBeNull();
    });
  });

  describe("findByEmailHash", () => {
    it("should find by emailHash and return domain", async () => {
      const emailHash = "hash123";
      const model = createUserModelMock({ emailHash });
      typeOrmRepoMock.findOneBy.mockResolvedValue(model);

      const result = await repository.findByEmailHash(emailHash);

      expect(typeOrmRepoMock.findOneBy).toHaveBeenCalledWith({ emailHash });
      expect(result?.emailHash).toBe(emailHash);
    });
  });
});
