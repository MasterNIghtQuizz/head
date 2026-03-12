import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("common-crypto", () => ({
  CryptoService: {
    encrypt: vi.fn((val) => `encrypted-${val}`),
    decrypt: vi.fn((val) => val.replace("encrypted-", "")),
    hashPassword: vi.fn(() => Promise.resolve("hashed-password")),
    comparePassword: vi.fn(() => Promise.resolve(true)),
    sha256Hash: vi.fn((val) => `hash-${val}`),
    sign: vi.fn((val) => `signed-${val}`),
    verify: vi.fn((val) => `verified-${val}`),
  },
}));

import { UserService } from "./user.service.js";
import { createUserEntityMock } from "../../../tests/factories/user.factory.js";
import { CryptoService } from "common-crypto";
import { UnauthorizedError, ConflictError, NotFoundError } from "common-errors";

/**
 * @typedef {import('vitest').Mocked<import('../repositories/user.repository.js').UserRepository>} UserRepositoryMock
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
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ (
      /** @type {unknown} */ ({
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        delByPattern: vi.fn(),
      })
    );

    userRepositoryMock = /** @type {UserRepositoryMock} */ (
      /** @type {unknown} */ ({
        findByEmailHash: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        valkeyRepository: valkeyRepositoryMock,
      })
    );

    kafkaProducerMock = /** @type {KafkaProducerMock} */ (
      /** @type {unknown} */ ({
        publish: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      })
    );

    userService = new UserService(
      /** @type {any} */ (kafkaProducerMock),
      /** @type {any} */ (userRepositoryMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register a new user and publish event", async () => {
      const dto =
        /** @type {import('../contracts/user.dto.js').RegisterUserDto} */ ({
          email: "test@test.com",
          password: "password123",
        });
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);
      const userEntity = createUserEntityMock({
        id: "user-1",
        email: "encrypted-test@test.com",
      });
      userRepositoryMock.create.mockResolvedValue(userEntity);

      const result = await userService.register(dto);

      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        "user-registered",
        expect.objectContaining({
          id: "user-1",
          email: dto.email,
        }),
      );
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("test@test.com");
    });

    it("should throw ConflictError if user exists", async () => {
      userRepositoryMock.findByEmailHash.mockResolvedValue(
        createUserEntityMock(),
      );
      const dto =
        /** @type {import('../contracts/user.dto.js').RegisterUserDto} */ ({
          email: "exist@test.com",
          password: "p",
        });
      await expect(userService.register(dto)).rejects.toThrow(ConflictError);
    });
  });

  describe("login", () => {
    it("should return user DTO on valid credentials", async () => {
      const userEntity = createUserEntityMock();
      userRepositoryMock.findByEmailHash.mockResolvedValue(userEntity);
      vi.mocked(CryptoService.comparePassword).mockResolvedValue(true);

      const result = await userService.login({
        email: "test@test.com",
        password: "correct",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(userEntity.id);
    });

    it("should throw UnauthorizedError on wrong password", async () => {
      const userEntity = createUserEntityMock();
      userRepositoryMock.findByEmailHash.mockResolvedValue(userEntity);
      vi.mocked(CryptoService.comparePassword).mockResolvedValue(false);

      await expect(
        userService.login({ email: "test@test.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("findById", () => {
    it("should return cached user if available", async () => {
      const cachedDto = { id: "1", email: "cached@test.com", role: "USER" };
      valkeyRepositoryMock.get.mockResolvedValue(cachedDto);

      const result = await userService.findById("1");

      expect(result).toEqual(cachedDto);
      expect(userRepositoryMock.findOne).not.toHaveBeenCalled();
    });

    it("should fetch from DB and cache if not in valkey", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entity = createUserEntityMock({
        id: "1",
        email: "encrypted-test@test.com",
      });
      userRepositoryMock.findOne.mockResolvedValue(entity);

      const result = await userService.findById("1");

      expect(userRepositoryMock.findOne).toHaveBeenCalledWith("1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result.id).toBe("1");
    });

    it("should throw NotFoundError if user not found", async () => {
      userRepositoryMock.findOne.mockResolvedValue(null);
      await expect(userService.findById("unknown")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("updateUser", () => {
    it("should update user and invalidate cache", async () => {
      const userId = "user-1";
      const userEntity = createUserEntityMock({ id: userId });
      userRepositoryMock.findOne.mockResolvedValue(userEntity);
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);
      userRepositoryMock.update.mockResolvedValue(
        /** @type {any} */ ({ affected: 1 }),
      );

      const updateData =
        /** @type {import('../contracts/user.dto.js').UpdateUserDto} */ ({
          email: "new@test.com",
          password: "new-password",
        });

      vi.spyOn(userService, "findById").mockResolvedValue({
        id: userId,
        email: "new@test.com",
        role: "USER",
      });

      await userService.updateUser(userId, updateData);

      expect(userRepositoryMock.update).toHaveBeenCalled();
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(`user:${userId}`);
    });
  });
  describe("refreshAccessToken", () => {
    it("should return new tokens if refresh token is valid", async () => {
      const refreshToken = "valid-refresh-token";
      const payload = { userId: "user-1", type: "REFRESH" };
      const userDto = { id: "user-1", email: "test@test.com", role: "USER" };

      vi.mocked(CryptoService).verify = vi.fn().mockReturnValue(payload);
      vi.spyOn(userService, "findById").mockResolvedValue(
        /** @type {any} */ (userDto),
      );
      vi.mocked(CryptoService).sign = vi.fn().mockReturnValue("new-token");

      const result = await userService.refreshAccessToken(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe("user-1");
    });

    it("should throw UnauthorizedError if token is missing", async () => {
      await expect(userService.refreshAccessToken("")).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError if verification fails", async () => {
      vi.mocked(CryptoService).verify = vi.fn().mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(userService.refreshAccessToken("invalid")).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("findAll", () => {
    it("should return cached users if available", async () => {
      const cachedUsers = [{ id: "1" }, { id: "2" }];
      valkeyRepositoryMock.get.mockResolvedValue(cachedUsers);

      const result = await userService.findAll();

      expect(result).toEqual(cachedUsers);
      expect(userRepositoryMock.findAll).not.toHaveBeenCalled();
    });

    it("should fetch from DB and cache if not in valkey", async () => {
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const entities = [
        createUserEntityMock({ id: "1" }),
        createUserEntityMock({ id: "2" }),
      ];
      userRepositoryMock.findAll.mockResolvedValue(entities);

      const result = await userService.findAll();

      expect(userRepositoryMock.findAll).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "user:all",
        expect.any(Array),
        expect.any(Number),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("grantPermissions", () => {
    it("should update user role and invalidate cache", async () => {
      const adminId = "admin-1";
      const targetUserId = "user-1";
      const data =
        /** @type {import('../contracts/user.dto.js').GrantPermissionsDto} */ ({
          user_id: targetUserId,
          role: "ADMIN",
        });

      const userEntity = createUserEntityMock({ id: targetUserId });
      userRepositoryMock.findOne
        .mockResolvedValueOnce(userEntity)
        .mockResolvedValueOnce({ ...userEntity, role: "ADMIN" });

      await userService.grantPermissions(adminId, data);

      expect(userRepositoryMock.update).toHaveBeenCalledWith(targetUserId, {
        role: "ADMIN",
      });
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        `user:${targetUserId}`,
      );
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:all");
    });

    it("should throw NotFoundError if user to update does not exist", async () => {
      userRepositoryMock.findOne.mockResolvedValue(null);
      const data = { user_id: "none", role: "ADMIN" };

      await expect(
        userService.grantPermissions("admin", /** @type {any} */ (data)),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteUser", () => {
    it("should delete user, invalidate cache and publish event", async () => {
      const userId = "user-to-delete";

      await userService.deleteUser(userId);

      expect(userRepositoryMock.delete).toHaveBeenCalledWith(userId);
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(`user:${userId}`);
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("user:all");
      expect(kafkaProducerMock.publish).toHaveBeenCalledWith("user-deleted", {
        userId,
      });
    });

    it("should throw error if repository delete fails", async () => {
      userRepositoryMock.delete.mockRejectedValue(new Error("DB Error"));

      await expect(userService.deleteUser("1")).rejects.toThrow();
    });
  });
});
