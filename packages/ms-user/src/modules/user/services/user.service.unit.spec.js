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

describe("UserService Unit Tests", () => {
  /** @type {UserService} */
  let userService;

  /** @type {any} */
  let userRepositoryMock;

  /** @type {any} */
  let kafkaProducerMock;

  /** @type {any} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    valkeyRepositoryMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    userRepositoryMock = {
      findByEmailHash: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      valkeyRepository: valkeyRepositoryMock,
    };

    kafkaProducerMock = {
      publish: vi.fn(),
    };

    userService = new UserService(kafkaProducerMock, userRepositoryMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const dto = { email: "test@test.com", password: "p12" };
      userRepositoryMock.findByEmailHash.mockResolvedValue(null);

      const entity = createUserEntityMock({ id: "1", email: "test@test.com" });
      userRepositoryMock.create.mockResolvedValue(entity);

      const result = await userService.register(dto);

      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(result.user.id).toBe("1");
    });
  });

  describe("login", () => {
    it("should login user if password is correct", async () => {
      const entity = createUserEntityMock({ id: "1" });
      // Mock checkPassword because it's on the entity class
      entity.checkPassword = vi.fn().mockResolvedValue(true);

      userRepositoryMock.findByEmailHash.mockResolvedValue(entity);

      const result = await userService.login({
        email: "t@t.com",
        password: "p",
      });

      expect(result.user.id).toBe("1");
    });
  });
});
