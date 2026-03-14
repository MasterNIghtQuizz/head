import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";

describe("Question E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let accessToken;

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();
    const tokenResponse = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: "e2e-user", role: "admin" },
    });
    accessToken = tokenResponse.json().token;
  });

  describe("GET /questions", () => {
    it("should return 200 and questions list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions",
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });
  });

  describe("GET /questions/:id", () => {
    it("should return 200 and question data", async () => {
      const qId = "550e8400-e29b-41d4-a716-446655440001";
      const response = await app.inject({
        method: "GET",
        url: `/questions/${qId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(qId);
    });

    it("should return 404 when question not found", async () => {
      const unusedId = "550e8400-e29b-41d4-a716-446655440099";
      const response = await app.inject({
        method: "GET",
        url: `/questions/${unusedId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /questions/quiz/:quizId", () => {
    it("should return 200 and list of questions for a quiz", async () => {
      const quizId = "550e8400-e29b-41d4-a716-446655440002";
      const response = await app.inject({
        method: "GET",
        url: `/questions/quiz/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });
  });

  describe("POST /questions", () => {
    it("should create question and return 201", async () => {
      const payload = {
        label: "E2E Question",
        type: "multiple",
        order_index: 2,
        timer_seconds: 45,
        quiz_id: "550e8400-e29b-41d4-a716-446655440002",
      };
      const response = await app.inject({
        method: "POST",
        url: "/questions",
        payload,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().label).toBe("E2E Question");
    });
  });
});
