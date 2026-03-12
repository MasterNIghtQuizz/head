// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";

describe("Technical User Flow E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();
  });

  it("should complete a complex flow: register -> login -> get me -> update me -> refresh token -> admin actions", async () => {
    const initialEmail = `flow-${Date.now()}@test.com`;
    const updatedEmail = `updated-${Date.now()}@test.com`;
    const password = "password123";

    const regRes = await app.inject({
      method: "POST",
      url: "/user/register",
      payload: { email: initialEmail, password, role: UserRole.USER },
    });
    expect(regRes.statusCode).toBe(201);
    const loginRes = await app.inject({
      method: "POST",
      url: "/user/login",
      payload: { email: initialEmail, password },
    });
    expect(loginRes.statusCode).toBe(200);
    // eslint-disable-next-line prefer-const
    let { accessToken, refreshToken } = loginRes.json();

    const meRes = await app.inject({
      method: "GET",
      url: "/user/me",
      headers: { "access-token": accessToken },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().email).toBe(initialEmail);

    const updateRes = await app.inject({
      method: "PUT",
      url: "/user/me",
      headers: { "access-token": accessToken },
      payload: { email: updatedEmail },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().email).toBe(updatedEmail);

    const refreshRes = await app.inject({
      method: "POST",
      url: "/user/refresh-access-token",
      headers: { "refresh-token": refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    accessToken = refreshRes.json().accessToken;

    const meAfterUpdateRes = await app.inject({
      method: "GET",
      url: "/user/me",
      headers: { "access-token": accessToken },
    });
    expect(meAfterUpdateRes.json().email).toBe(updatedEmail);

    const adminLoginRes = await app.inject({
      method: "POST",
      url: "/user/login",
      payload: { email: "admin@test.com", password: "admin@test.com" },
    });
    expect(adminLoginRes.statusCode).toBe(200);
    const adminAccessToken = adminLoginRes.json().accessToken;

    const usersRes = await app.inject({
      method: "GET",
      url: "/user",
      headers: { "access-token": adminAccessToken },
    });
    expect(usersRes.statusCode).toBe(200);
    /** @type {Array<import('common-contracts').UserResponse>} */
    const users = usersRes.json();
    expect(users.some((u) => u.email === updatedEmail)).toBe(true);

    const promoteRes = await app.inject({
      method: "POST",
      url: "/user/permissions",
      headers: { "access-token": adminAccessToken },
      payload: { user_id: regRes.json().user.id, role: UserRole.ADMIN },
    });
    expect(promoteRes.statusCode).toBe(200);

    const refreshAfterPromoteRes = await app.inject({
      method: "POST",
      url: "/user/refresh-access-token",
      headers: { "refresh-token": refreshToken },
    });
    expect(refreshAfterPromoteRes.statusCode).toBe(200);
    const newAdminAccessToken = refreshAfterPromoteRes.json().accessToken;

    const usersAdminRes = await app.inject({
      method: "GET",
      url: "/user",
      headers: { "access-token": newAdminAccessToken },
    });
    expect(usersAdminRes.statusCode).toBe(200);

    const deleteMeRes = await app.inject({
      method: "DELETE",
      url: "/user/me",
      headers: { "access-token": newAdminAccessToken },
    });
    expect(deleteMeRes.statusCode).toBe(204);

    const checkDeletedRes = await app.inject({
      method: "GET",
      url: "/user",
      headers: { "access-token": adminAccessToken },
    });
    expect(checkDeletedRes.json().some((u) => u.email === updatedEmail)).toBe(
      false,
    );
  });
});
