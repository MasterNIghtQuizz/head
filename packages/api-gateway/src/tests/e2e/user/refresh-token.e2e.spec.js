import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";

describe("Refresh Token E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let refreshToken;
  const userId = "550e8400-e29b-41d4-a716-446655440101";

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();

    const refreshTokenRes = await app.inject({
      method: "POST",
      url: "/helpers/refresh-token",
      payload: { userId: userId, role: UserRole.USER },
    });
    refreshToken = refreshTokenRes.json().token;
  });

  it("should return 401 if refresh-token header is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/refresh-access-token",
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Missing refresh-token header");
  });

  it("should return 401 if refresh-token is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/refresh-access-token",
      headers: { "refresh-token": "invalid-token" },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Invalid or expired refresh token");
  });

  it("should return new tokens on valid refresh-token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/refresh-access-token",
      headers: { "refresh-token": refreshToken },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.id).toBe(userId);
  });
});
