import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { config } from "../../../config.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";

describe("User Cache E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let adminToken;
  /** @type {string} */
  let userToken;
  /** @type {ValkeyService} */
  let valkeyService;
  /** @type {ValkeyRepository} */
  let valkeyRepository;

  const adminId = "550e8400-e29b-41d4-a716-446655440100";
  const userId = "550e8400-e29b-41d4-a716-446655440101";

  beforeAll(async () => {
    await seedDatabase();
    app = await createServer();

    valkeyService = new ValkeyService({
      host: config.valkey.host,
      port: config.valkey.port,
      password: config.valkey.password,
      db: config.valkey.db,
      enabled: true,
    });

    await valkeyService.connect();
    valkeyRepository = new ValkeyRepository(valkeyService);

    const adminTokenRes = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: adminId, role: UserRole.ADMIN },
    });
    adminToken = adminTokenRes.json().token;

    const userTokenRes = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: userId, role: UserRole.USER },
    });
    userToken = userTokenRes.json().token;
  });

  afterAll(async () => {
    await valkeyService.disconnect();
  });

  beforeEach(async () => {
    await valkeyRepository.delByPattern("*");
  });

  describe("Cache Population", () => {
    it("should populate 'user:all' cache on GET /user (Admin)", async () => {
      const cacheKey = "user:all";
      expect(await valkeyRepository.get(cacheKey)).toBeNull();

      const response = await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": adminToken },
      });

      expect(response.statusCode).toBe(200);
      const users = response.json();
      expect(users.length).toBeGreaterThan(0);

      const cachedValue = await valkeyRepository.get(cacheKey);
      expect(cachedValue).not.toBeNull();
      expect(cachedValue.length).toBe(users.length);
    });

    it("should populate 'user:id' cache on GET /user/:id (Admin)", async () => {
      const cacheKey = `user:${userId}`;
      expect(await valkeyRepository.get(cacheKey)).toBeNull();

      const response = await app.inject({
        method: "GET",
        url: `/user/${userId}`,
        headers: { "access-token": adminToken },
      });

      expect(response.statusCode).toBe(200);
      const user = response.json();

      const cachedValue = await valkeyRepository.get(cacheKey);
      expect(cachedValue).not.toBeNull();
      expect(cachedValue.id).toBe(userId);
      expect(cachedValue.email).toBe(user.email);
    });

    it("should populate 'user:id' cache on GET /user/me", async () => {
      const cacheKey = `user:${userId}`;
      expect(await valkeyRepository.get(cacheKey)).toBeNull();

      const response = await app.inject({
        method: "GET",
        url: "/user/me",
        headers: { "access-token": userToken },
      });

      expect(response.statusCode).toBe(200);
      expect(await valkeyRepository.get(cacheKey)).not.toBeNull();
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate 'user:all' and 'user:id' on updateMe", async () => {
      // 1. Populate cache
      await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": adminToken },
      });
      await app.inject({
        method: "GET",
        url: "/user/me",
        headers: { "access-token": userToken },
      });

      const allKey = "user:all";
      const idKey = `user:${userId}`;

      expect(await valkeyRepository.get(allKey)).not.toBeNull();
      expect(await valkeyRepository.get(idKey)).not.toBeNull();

      // 2. Update
      const response = await app.inject({
        method: "PUT",
        url: "/user/me",
        headers: { "access-token": userToken },
        payload: { email: "cache-inval@test.com" },
      });

      expect(response.statusCode).toBe(200);

      expect(await valkeyRepository.get(allKey)).toBeNull();
      const repopulated = await valkeyRepository.get(idKey);
      expect(repopulated).not.toBeNull();
      expect(repopulated.email).toBe("cache-inval@test.com");
    });

    it("should invalidate on register", async () => {
      await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": adminToken },
      });
      const allKey = "user:all";
      expect(await valkeyRepository.get(allKey)).not.toBeNull();

      await app.inject({
        method: "POST",
        url: "/user/register",
        payload: { email: "new-cache@test.com", password: "p", role: "USER" },
      });

      expect(await valkeyRepository.get(allKey)).toBeNull();
    });

    it("should invalidate on deleteMe", async () => {
      const idKey = `user:${userId}`;
      const allKey = "user:all";

      await app.inject({
        method: "GET",
        url: "/user/me",
        headers: { "access-token": userToken },
      });
      await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": adminToken },
      });

      expect(await valkeyRepository.get(idKey)).not.toBeNull();
      expect(await valkeyRepository.get(allKey)).not.toBeNull();

      const response = await app.inject({
        method: "DELETE",
        url: "/user/me",
        headers: { "access-token": userToken },
      });

      expect(response.statusCode).toBe(204);
      expect(await valkeyRepository.get(idKey)).toBeNull();
      expect(await valkeyRepository.get(allKey)).toBeNull();
    });
  });
});
