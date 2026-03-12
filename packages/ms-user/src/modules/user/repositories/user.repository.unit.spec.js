import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { UserRepository } from "./user.repository.js";
import { createUserEntityMock } from "../../../tests/factories/user.factory.js";

/**
 * @typedef {import('typeorm').DataSource} DataSource
 * @typedef {import('typeorm').Repository<import('../entities/user.entity.js').UserEntity>} UserRepo
 * @typedef {import('vitest').Mocked<UserRepo>} UserRepoMock
 * @typedef {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} ValkeyRepositoryMock
 */

describe("UserRepository Unit Tests", () => {
  /** @type {UserRepository} */
  let userRepository;

  /** @type {import('vitest').Mocked<DataSource>} */
  let dataSourceMock;

  /** @type {UserRepoMock} */
  let typeormRepoMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    typeormRepoMock = /** @type {UserRepoMock} */ (
      /** @type {unknown} */ ({
        find: vi.fn(),
        findOneBy: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })
    );

    dataSourceMock = /** @type {import('vitest').Mocked<DataSource>} */ (
      /** @type {unknown} */ ({
        getRepository: vi.fn().mockReturnValue(typeormRepoMock),
      })
    );

    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ (
      /** @type {unknown} */ ({
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        delByPattern: vi.fn(),
      })
    );

    userRepository = new UserRepository(
      /** @type {import('typeorm').DataSource} */ (dataSourceMock),
      valkeyRepositoryMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findByEmailHash", () => {
    it("should call findOneBy with correct emailHash", async () => {
      const emailHash = "hash-123";
      const user = createUserEntityMock({ emailHash });
      const spy = vi
        .spyOn(typeormRepoMock, "findOneBy")
        .mockResolvedValue(user);

      const result = await userRepository.findByEmailHash(emailHash);

      expect(spy).toHaveBeenCalledWith({ emailHash });
      expect(result).toEqual(user);
    });
  });

  describe("findAll", () => {
    it("should call find on typeorm repository", async () => {
      const users = [createUserEntityMock()];
      vi.spyOn(typeormRepoMock, "find").mockResolvedValue(users);

      const result = await userRepository.findAll();

      expect(typeormRepoMock.find).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe("create", () => {
    it("should create and save a new user", async () => {
      const userData = { email: "new@test.com" };
      const userInstance = createUserEntityMock(userData);
      vi.spyOn(typeormRepoMock, "create").mockReturnValue(userInstance);
      vi.spyOn(typeormRepoMock, "save").mockResolvedValue(userInstance);

      const result = await userRepository.create(userData);

      expect(typeormRepoMock.create).toHaveBeenCalledWith(userData);
      expect(typeormRepoMock.save).toHaveBeenCalledWith(userInstance);
      expect(result).toEqual(userInstance);
    });
  });
});
