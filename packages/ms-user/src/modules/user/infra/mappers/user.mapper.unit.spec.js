import { describe, it, expect, vi, afterEach } from "vitest";
import { UserMapper } from "./user.mapper.js";
import { createUserEntityMock, createUserModelMock } from "../../../../tests/factories/user.factory.js";

/**
 * @typedef {import('vitest').Mocked<typeof import('common-crypto').CryptoService>} CryptoServiceMock
 */

vi.mock("common-crypto", () => ({
  CryptoService: {
    encrypt: vi.fn((val) => `encrypted-${val}`),
    decrypt: vi.fn((val) => val.replace("encrypted-", "")),
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

describe("UserMapper Unit Tests", () => {
  const encryptionKey = "test-key";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("toDomain", () => {
    it("should transform model to entity correctly", () => {
      const model = createUserModelMock({ 
        id: "1", 
        email: "encrypted-test@example.com" 
      });

      const entity = UserMapper.toDomain(model, encryptionKey);

      expect(entity.id).toBe("1");
      expect(entity.email).toBe("test@example.com");
      expect(entity.role).toBe(model.role);
    });
  });

  describe("toPersistence", () => {
    it("should transform entity to database model correctly", () => {
      const entity = createUserEntityMock({ 
        email: "test@example.com",
        role: "ADMIN"
      });

      const persistence = UserMapper.toPersistence(entity, encryptionKey);

      expect(persistence.email).toBe("encrypted-test@example.com");
      expect(persistence.role).toBe("ADMIN");
      expect(persistence.emailHash).toBe(entity.emailHash);
    });
  });

  describe("toDto", () => {
    it("should transform entity to public response DTO", () => {
      const entity = createUserEntityMock({ id: "1", email: "test@test.com" });
      
      const dto = UserMapper.toDto(entity);

      expect(dto.id).toBe("1");
      expect(dto.email).toBe("test@test.com");
      // @ts-ignore - access for check in JS
      expect(dto.password).toBeUndefined();
    });
  });
});
