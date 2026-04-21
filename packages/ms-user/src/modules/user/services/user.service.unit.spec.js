import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { UserService } from "./user.service.js";
import { createUserEntityMock } from "../../../tests/factories/user.factory.js";
import { UnauthorizedError, ConflictError } from "common-errors";
import { UserRole, TokenType } from "common-auth";
import { UserEventTypes } from "common-contracts";
import logger, { mockLogger } from "common-logger";

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

/**
 * @typedef {import('vitest').Mocked<import('../core/ports/user.repository.js').IUserRepository>} UserRepositoryMock
 * @typedef {import('vitest').Mocked<import('common-kafka').KafkaProducer>} KafkaProducerMock
 * @typedef {import('vitest').Mocked<import('common-valkey').ValkeyRepository>} ValkeyRepositoryMock
 */

describe("UserService Unit Tests", () => {
  /** @type {UserService} */
  let userService;

  /** @type {UserRepositoryMock} */
  let userRepositoryMock;

  /** @type {KafkaProducerMock} */
  let kafkaProducerMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    mockLogger(vi);
    // @ts-ignore
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    });

    userRepositoryMock = /** @type {UserRepositoryMock} */ ({
      findByEmailHash: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    });

    // @ts-ignore
    kafkaProducerMock = /** @type {KafkaProducerMock} */ ({
      publish: vi.fn(),
    });

    userService = new UserService(
      /** @type {KafkaProducerMock} */(kafkaProducerMock),
      /** @type {UserRepositoryMock} */(userRepositoryMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register a new user and publish event", async () => {
      const dto = { email: "test@test.com", password: "password123" };
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);

      const userEntity = createUserEntityMock({
        id: "user-1",
        email: "test@test.com",
      });
      userRepositoryMock.create.mockResolvedValue(userEntity);

      const result = await userService.register(dto);

      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        UserEventTypes.USER_CREATED,
        expect.objectContaining({
          userId: "user-1",
          email: dto.email,
          role: UserRole.USER,
        }),
      );
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("test@test.com");
    });

    it("should throw ConflictError if user already exists", async () => {
      userRepositoryMock.findByEmailHash.mockResolvedValue(
        createUserEntityMock(),
      );
      const dto = { email: "exist@test.com", password: "p" };

      await expect(userService.register(dto)).rejects.toThrow(ConflictError);
    });

    it("should handle cache deletion error gracefully", async () => {
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);
      userRepositoryMock.create.mockResolvedValue(createUserEntityMock());
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Cache fail"));

      const result = await userService.register({
        email: "t@t.com",
        password: "p",
      });
      expect(result).toBeDefined();
    });
  });

  describe("login", () => {
    it("should login user with correct credentials", async () => {
      const userEntity = createUserEntityMock({ id: "1" });
      vi.spyOn(userEntity, "checkPassword").mockResolvedValue(true);
      userRepositoryMock.findByEmailHash.mockResolvedValue(userEntity);

      const result = await userService.login({
        email: "t@t.com",
        password: "p",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe("1");
    });

    it("should throw UnauthorizedError on invalid credentials", async () => {
      const userEntity = createUserEntityMock();
      vi.spyOn(userEntity, "checkPassword").mockResolvedValue(false);
      userRepositoryMock.findByEmailHash.mockResolvedValue(userEntity);

      await expect(
        userService.login({ email: "t@t.com", password: "p" }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError if user not found", async () => {
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);
      await expect(
        userService.login({ email: "none@t.com", password: "p" }),
      ).rejects.toThrow();
    });
  });

  describe("refreshAccessToken", () => {
    it("should return new tokens if user exists", async () => {
      const userDto = { id: "1", email: "t@t.com", role: UserRole.USER };
      vi.spyOn(userService, "findById").mockResolvedValue(
        /** @type {import('../contracts/user.dto.js').UserResponseDto} */(
          userDto
        ),
      );

      const result = await userService.refreshAccessToken("1");

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe("1");
    });

    it("should throw UnauthorizedError if findById fails", async () => {
      vi.spyOn(userService, "findById").mockRejectedValue(
        new Error("Not found"),
      );
      await expect(userService.refreshAccessToken("unknown")).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("findById", () => {
    it("should return cached user if present", async () => {
      const cached =
        /** @type {import('../contracts/user.dto.js').UserResponseDto} */ ({
          id: "1",
          email: "c@c.com",
          role: "USER",
        });
      valkeyRepositoryMock.get.mockResolvedValue(cached);

      const result = await userService.findById("1");

      expect(result).toEqual(cached);
      expect(userRepositoryMock.findOne).not.toHaveBeenCalled();
    });

    it("should fetch and cache if not in valkey", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entity = createUserEntityMock({ id: "1" });
      userRepositoryMock.findOne.mockResolvedValue(entity);

      const result = await userService.findById("1");

      expect(userRepositoryMock.findOne).toHaveBeenCalledWith("1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result.id).toBe("1");
    });

    it("should throw error if user not found in DB", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      userRepositoryMock.findOne.mockResolvedValue(null);
      await expect(userService.findById("unknown")).rejects.toThrow();
    });
  });

  describe("findAll", () => {
    it("should return cached users", async () => {
      const cached = [{ id: "1" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const result = await userService.findAll();
      expect(result).toEqual(cached);
      expect(userRepositoryMock.findAll).not.toHaveBeenCalled();
    });

    it("should fetch from DB if cache empty", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      userRepositoryMock.findAll.mockResolvedValue([createUserEntityMock()]);
      const result = await userService.findAll();
      expect(result).toHaveLength(1);
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "user:all",
        expect.any(Array),
        expect.any(Number),
      );
    });
  });

  describe("updateUser", () => {
    it("should update user and invalidate cache", async () => {
      const entity = createUserEntityMock({ id: "1" });
      userRepositoryMock.findOne.mockResolvedValue(entity);
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);
      userRepositoryMock.update.mockResolvedValue();

      const userDto = { id: "1", email: "new@t.com", role: UserRole.USER };
      vi.spyOn(userService, "findById").mockResolvedValue(
        /** @type {import('../contracts/user.dto.js').UserResponseDto} */(
          userDto
        ),
      );

      const result = await userService.updateUser(
        "1",
        /** @type {import('../contracts/user.dto.js').UpdateUserDto} */({
          email: "new@t.com",
        }),
      );

      expect(userRepositoryMock.update).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:all");
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        UserEventTypes.USER_UPDATED,
        expect.objectContaining({
          userId: "1",
          email: "new@t.com",
          role: UserRole.USER,
        }),
      );
      expect(result.email).toBe("new@t.com");
    });

    it("should throw ConflictError if email taken by another user", async () => {
      const entity = createUserEntityMock({ id: "1" });
      const otherEntity = createUserEntityMock({ id: "2" });
      userRepositoryMock.findOne.mockResolvedValue(entity);
      userRepositoryMock.findByEmailHash.mockResolvedValue(otherEntity);

      await expect(
        userService.updateUser(
          "1",
          /** @type {import('../contracts/user.dto.js').UpdateUserDto}  */({
            email: "taken@t.com",
          }),
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("deleteUser", () => {
    it("should delete user and invalidate cache", async () => {
      await userService.deleteUser("1");
      expect(userRepositoryMock.delete).toHaveBeenCalledWith("1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:all");
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        UserEventTypes.USER_DELETED,
        {
          userId: "1",
        },
      );
    });
  });

  describe("grantPermissions", () => {
    it("should update user role", async () => {
      const entity = createUserEntityMock({ id: "1", role: UserRole.USER });
      userRepositoryMock.findOne.mockResolvedValueOnce(entity);
      userRepositoryMock.findOne.mockResolvedValueOnce(
        /** @type {import('../core/entities/user.entity.js').UserEntity} */({
          ...entity,
          role: UserRole.ADMIN,
        }),
      );

      const result = await userService.grantPermissions("admin-id", {
        user_id: "1",
        role: UserRole.ADMIN,
      });

      expect(userRepositoryMock.update).toHaveBeenCalledWith("1", {
        role: UserRole.ADMIN,
      });
      expect(result.role).toBe(UserRole.ADMIN);
    });
  });
});
