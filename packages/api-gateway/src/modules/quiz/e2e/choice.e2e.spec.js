import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";

describe("Choice E2E Tests", () => {
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

  describe("GET /choices", () => {
    it("should return 200 and list of choices", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/choices",
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(4);
    });
  });

  describe("GET /choices/:id", () => {
    it("should return 200 and choice data", async () => {
      const choiceId = "550e8400-e29b-41d4-a716-446655440000";
      const response = await app.inject({
        method: "GET",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(choiceId);
    });
  });

  describe("GET /choices/question/:questionId", () => {
    it("should return 200 and choices list for a question", async () => {
      const questionId = "550e8400-e29b-41d4-a716-446655440001";
      const response = await app.inject({
        method: "GET",
        url: `/choices/question/${questionId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });
  });

  describe("POST /choices", () => {
    it("should create choice and return 201", async () => {
      const payload = {
        text: "New E2E Choice",
        is_correct: false,
        question_id: "550e8400-e29b-41d4-a716-446655440001",
      };
      const response = await app.inject({
        method: "POST",
        url: "/choices",
        payload,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().text).toBe("New E2E Choice");
    });
  });

  describe("DELETE /choices/:id", () => {
    it("should return 204 on success", async () => {
      const choiceId = "550e8400-e29b-41d4-a716-446655440000";
      const response = await app.inject({
        method: "DELETE",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
