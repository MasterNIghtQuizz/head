import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { CryptoService } from "common-crypto";
import { TokenType, UserRole } from "common-auth";
import path from "node:path";
import { config } from "../../../config.js";

describe("User E2E Tests", () => {
  /** @type {import('../types/fastify.js').AppInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let adminToken;
  /** @type {string} */
  let userToken;

  const adminId = "550e8400-e29b-41d4-a716-446655440100";
  const userId = "550e8400-e29b-41d4-a716-446655440101";

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();

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

  describe("Authentication & Authorization", () => {
    it("should return 401 if no token provided on protected route", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/user/me",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 if token is expired", async () => {
      const privateKeyPath = path.resolve(config.auth.access.privateKeyPath);
      const expiredToken = CryptoService.sign(
        { userId: "test", role: UserRole.USER, type: TokenType.ACCESS },
        privateKeyPath,
        { expiresIn: "0s" },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await app.inject({
        method: "GET",
        url: "/user/me",
        headers: { "access-token": expiredToken },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 403 if user tries to access admin route", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": userToken },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("Public Routes (register/login)", () => {
    it("should register a new user", async () => {
      const payload = {
        email: "new-e2e@test.com",
        password: "password123",
        role: UserRole.USER,
      };
      const response = await app.inject({
        method: "POST",
        url: "/user/register",
        payload,
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().user.email).toBe(payload.email);
    });

    it("should return 409 if registering existing email", async () => {
      const payload = {
        email: "admin@test.com",
        password: "password123",
        role: UserRole.USER,
      };
      const response = await app.inject({
        method: "POST",
        url: "/user/register",
        payload,
      });
      expect(response.statusCode).toBe(409);
    });

    it("should return 200 on valid login", async () => {
      const payload = { email: "user@test.com", password: "user123" };
      const response = await app.inject({
        method: "POST",
        url: "/user/login",
        payload,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.email).toBe(payload.email);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it("should return 401 on invalid login", async () => {
      const payload = { email: "user@test.com", password: "wrong-password" };
      const response = await app.inject({
        method: "POST",
        url: "/user/login",
        payload,
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("Protected Profile Routes (Me)", () => {
    it("should get current user profile", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/user/me",
        headers: { "access-token": userToken },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(userId);
    });

    it("should update current user profile", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/user/me",
        headers: { "access-token": userToken },
        payload: { email: "updated-me@test.com" },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().email).toBe("updated-me@test.com");
    });
  });

  describe("Admin Routes", () => {
    it("should find all users as admin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/user",
        headers: { "access-token": adminToken },
      });
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json())).toBe(true);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/user/550e8400-e29b-41d4-a716-446655440999",
        headers: { "access-token": adminToken },
      });
      expect(response.statusCode).toBe(404);
    });

    it("should update any user as admin", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/user/${userId}`,
        headers: { "access-token": adminToken },
        payload: { role: UserRole.ADMIN },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().role).toBe(UserRole.ADMIN);
    });
  });
});
