import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TypeOrmUserRepository } from "../infra/persistence/typeorm-user.repository.js";
import { createUserEntityMock } from "../../../tests/factories/user.factory.js";
import { UserMapper } from "../infra/mappers/user.mapper.js";

describe("TypeOrmUserRepository Unit Tests", () => {
  /** @type {TypeOrmUserRepository} */
  let userRepository;

  /** @type {import('vitest').Mocked<import('typeorm').DataSource>} */
  let dataSourceMock;

  /** @type {any} */
  let typeormRepoMock;

  /** @type {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} */
  let valkeyRepositoryMock;

  const encryptionKey = "test-key";

  beforeEach(() => {
    typeormRepoMock = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    dataSourceMock = /** @type {any} */ ({
      getRepository: vi.fn().mockReturnValue(typeormRepoMock),
    });

    valkeyRepositoryMock = /** @type {any} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    });

    userRepository = new TypeOrmUserRepository(
      /** @type {any} */ (dataSourceMock),
      valkeyRepositoryMock,
      encryptionKey,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findByEmailHash", () => {
    it("should call findOneBy and map to domain", async () => {
      const emailHash = "hash-123";
      const userModel = {
        id: "1",
        email: "encrypted-email",
        emailHash,
        password: "pass",
        role: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(typeormRepoMock, "findOneBy").mockResolvedValue(userModel);

      const result = await userRepository.findByEmailHash(emailHash);

      expect(typeormRepoMock.findOneBy).toHaveBeenCalledWith({ emailHash });
      expect(result).toEqual(UserMapper.toDomain(userModel, encryptionKey));
    });
  });

  describe("create", () => {
    it("should map to persistence, save and map back to domain", async () => {
      const entity = createUserEntityMock({ email: "test@test.com" });
      const model = { ...entity, email: "encrypted-test@test.com" };

      vi.spyOn(typeormRepoMock, "create").mockReturnValue(model);
      vi.spyOn(typeormRepoMock, "save").mockResolvedValue(model);

      const result = await userRepository.create(entity);

      expect(typeormRepoMock.create).toHaveBeenCalled();
      expect(typeormRepoMock.save).toHaveBeenCalled();
      expect(result.email).toBe("test@test.com");
    });
  });
});
