import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";

describe("Quiz E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let accessToken;

  beforeEach(async () => {
    app = await createServer();
    const tokenResponse = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: "e2e-user", role: "admin" },
    });
    accessToken = tokenResponse.json().token;
  });

  describe("GET /quizzes", () => {
    it("should return 200 and list of quizzes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(1);
      expect(response.json()[0].title).toBe("General Knowledge");
    });
  });

  describe("GET /quizzes/:id", () => {
    it("should return 200 and quiz data", async () => {
      const quizId = "550e8400-e29b-41d4-a716-446655440002";
      const response = await app.inject({
        method: "GET",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(quizId);
    });

    it("should return 404 when quiz not found", async () => {
      const unusedId = "550e8400-e29b-41d4-a716-446655440099";
      const response = await app.inject({
        method: "GET",
        url: `/quizzes/${unusedId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /quizzes", () => {
    it("should create quiz and return 201", async () => {
      const payload = { title: "E2E Quiz", description: "desc" };
      const response = await app.inject({
        method: "POST",
        url: "/quizzes",
        payload,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().title).toBe("E2E Quiz");
    });

    it("should return 400 on bad request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/quizzes",
        payload: {},
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
