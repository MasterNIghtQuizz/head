import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { config } from "../../../config.js";
import { seedDatabase } from "../utils/test-utils.js";

describe("Quiz Cache E2E Tests", () => {
  /** @type {import('fastify').FastifyInstance<any, any, any, any>} */
  let app;
  /** @type {string} */
  let accessToken;
  /** @type {ValkeyService} */
  let valkeyService;
  /** @type {ValkeyRepository} */
  let valkeyRepository;

  beforeAll(async () => {
    await seedDatabase();
    app = await createServer();

    valkeyService = new ValkeyService({
      host: config.valkey.host,
      port: config.valkey.port,
      password: config.valkey.password,
      db: config.valkey.db,
    });

    await valkeyService.connect();
    valkeyRepository = new ValkeyRepository(valkeyService);

    const tokenResponse = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: "e2e-user", role: "admin" },
    });
    accessToken = tokenResponse.json().token;
  });

  afterAll(async () => {
    await valkeyService.disconnect();
  });

  beforeEach(async () => {
    await valkeyRepository.delByPattern("*");
  });

  describe("Cache Population", () => {
    it("should populate 'quizzes:all' cache on GET /quizzes", async () => {
      const cachedBefore = await valkeyRepository.get("quizzes:all");
      expect(cachedBefore).toBeNull();

      const response = await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      const quizzes = response.json();
      expect(quizzes.length).toBeGreaterThan(0);

      const cachedAfter = await valkeyRepository.get("quizzes:all");
      expect(cachedAfter).not.toBeNull();
      expect(cachedAfter).toEqual(quizzes);
    });

    it("should populate 'quiz:id' cache on GET /quizzes/:id", async () => {
      const quizId = "550e8400-e29b-41d4-a716-446655440002";
      const key = `quiz:${quizId}`;

      await valkeyRepository.del(key);
      const cachedBefore = await valkeyRepository.get(key);
      expect(cachedBefore).toBeNull();

      const response = await app.inject({
        method: "GET",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      const quiz = response.json();

      const cachedAfter = await valkeyRepository.get(key);
      expect(cachedAfter).not.toBeNull();
      expect(cachedAfter.id).toBe(quizId);
      expect(cachedAfter.title).toBe(quiz.title);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate caches on PUT /quizzes/:id", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/quizzes",
        payload: { title: "Cachatest Quiz" },
        headers: { "access-token": accessToken },
      });
      const quizId = createRes.json().id;
      const quizKey = `quiz:${quizId}`;
      const allKey = "quizzes:all";

      await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(allKey)).not.toBeNull();
      expect(await valkeyRepository.get(quizKey)).not.toBeNull();

      const updateResponse = await app.inject({
        method: "PUT",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
        payload: { title: "Updated Title" },
      });

      expect(updateResponse.statusCode).toBe(200);

      expect(await valkeyRepository.get(allKey)).toBeNull();
      expect(await valkeyRepository.get(quizKey)).toBeNull();
    });

    it("should invalidate caches on DELETE /quizzes/:id", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/quizzes",
        payload: { title: "To Delete" },
        headers: { "access-token": accessToken },
      });
      const quizId = createRes.json().id;
      const quizKey = `quiz:${quizId}`;
      const allKey = "quizzes:all";

      await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(deleteResponse.statusCode).toBe(204);

      expect(await valkeyRepository.get(allKey)).toBeNull();
      expect(await valkeyRepository.get(quizKey)).toBeNull();
    });
  });

  describe("Cache Cascade Invalidation", () => {
    it("should invalidate child question and choice caches when a quiz is deleted", async () => {
      const createQuizRes = await app.inject({
        method: "POST",
        url: "/quizzes",
        payload: { title: "Cascade Quiz" },
        headers: { "access-token": accessToken },
      });
      const quizId = createQuizRes.json().id;

      const createQuestionRes = await app.inject({
        method: "POST",
        url: "/questions",
        payload: {
          label: "Cascade Q1",
          type: "multiple",
          order_index: 1,
          timer_seconds: 15,
          quiz_id: quizId,
        },
        headers: { "access-token": accessToken },
      });
      const questionId = createQuestionRes.json().id;

      const createChoiceRes = await app.inject({
        method: "POST",
        url: "/choices",
        payload: {
          text: "Cascade C1",
          is_correct: true,
          question_id: questionId,
        },
        headers: { "access-token": accessToken },
      });
      const choiceId = createChoiceRes.json().id;

      await app.inject({
        method: "GET",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/questions/${questionId}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`quiz:${quizId}`)).not.toBeNull();
      expect(
        await valkeyRepository.get(`question:${questionId}`),
      ).not.toBeNull();
      expect(await valkeyRepository.get(`choice:${choiceId}`)).not.toBeNull();

      await app.inject({
        method: "DELETE",
        url: `/quizzes/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`quiz:${quizId}`)).toBeNull();
      expect(await valkeyRepository.get(`question:${questionId}`)).toBeNull();
      expect(await valkeyRepository.get(`choice:${choiceId}`)).toBeNull();
    });

    it("should invalidate child choice caches when a question is deleted", async () => {
      const quizId = "550e8400-e29b-41d4-a716-446655440002";

      const createQuestionRes = await app.inject({
        method: "POST",
        url: "/questions",
        payload: {
          label: "Cascade Q2",
          type: "multiple",
          order_index: 1,
          timer_seconds: 15,
          quiz_id: quizId,
        },
        headers: { "access-token": accessToken },
      });
      const questionId = createQuestionRes.json().id;

      const createChoiceRes = await app.inject({
        method: "POST",
        url: "/choices",
        payload: {
          text: "Cascade C2",
          is_correct: true,
          question_id: questionId,
        },
        headers: { "access-token": accessToken },
      });
      const choiceId = createChoiceRes.json().id;

      await app.inject({
        method: "GET",
        url: `/questions/${questionId}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });

      expect(
        await valkeyRepository.get(`question:${questionId}`),
      ).not.toBeNull();
      expect(await valkeyRepository.get(`choice:${choiceId}`)).not.toBeNull();

      await app.inject({
        method: "DELETE",
        url: `/questions/${questionId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`question:${questionId}`)).toBeNull();
      expect(await valkeyRepository.get(`choice:${choiceId}`)).toBeNull();
    });
  });

  describe("Question Caching", () => {
    const q1Id = "550e8400-e29b-41d4-a716-446655440001";
    const quizId = "550e8400-e29b-41d4-a716-446655440002";

    it("should populate 'question:id' and 'quiz:questions:id' caches", async () => {
      await valkeyRepository.del(`question:${q1Id}`);
      await valkeyRepository.del(`quiz:questions:${quizId}`);

      await app.inject({
        method: "GET",
        url: `/questions/quiz/${quizId}`,
        headers: { "access-token": accessToken },
      });

      expect(
        await valkeyRepository.get(`quiz:questions:${quizId}`),
      ).not.toBeNull();

      const response = await app.inject({
        method: "GET",
        url: `/questions/${q1Id}`,
        headers: { "access-token": accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(await valkeyRepository.get(`question:${q1Id}`)).not.toBeNull();
    });

    it("should invalidate question caches on update", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/questions",
        payload: {
          label: "Fresh Q",
          type: "multiple",
          order_index: 10,
          timer_seconds: 10,
          quiz_id: quizId,
        },
        headers: { "access-token": accessToken },
      });
      const qId = createRes.json().id;
      const key = `question:${qId}`;

      await app.inject({
        method: "GET",
        url: `/questions/${qId}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/questions/quiz/${quizId}`,
        headers: { "access-token": accessToken },
      });
      expect(await valkeyRepository.get(key)).not.toBeNull();

      await app.inject({
        method: "PUT",
        url: `/questions/${qId}`,
        payload: { label: "Updated Q" },
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(key)).toBeNull();
      expect(await valkeyRepository.get(`quiz:questions:${quizId}`)).toBeNull();
    });

    it("should invalidate parent quiz collection on create", async () => {
      // 2. GET by Quiz
      await app.inject({
        method: "GET",
        url: `/questions/quiz/${quizId}`,
        headers: { "access-token": accessToken },
      });
      expect(
        await valkeyRepository.get(`quiz:questions:${quizId}`),
      ).not.toBeNull();

      await app.inject({
        method: "POST",
        url: "/questions",
        payload: {
          label: "New Q",
          type: "multiple",
          order_index: 2,
          timer_seconds: 30,
          quiz_id: quizId,
        },
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`quiz:questions:${quizId}`)).toBeNull();
    });
  });

  describe("Choice Caching", () => {
    const c1Id = "550e8400-e29b-41d4-a716-446655440000";
    const q1Id = "550e8400-e29b-41d4-a716-446655440001";

    it("should populate 'choice:id' and 'question:choices:id' caches", async () => {
      await valkeyRepository.del(`choice:${c1Id}`);
      await valkeyRepository.del(`question:choices:${q1Id}`);

      await app.inject({
        method: "GET",
        url: `/choices/question/${q1Id}`,
        headers: { "access-token": accessToken },
      });

      expect(
        await valkeyRepository.get(`question:choices:${q1Id}`),
      ).not.toBeNull();

      await app.inject({
        method: "GET",
        url: `/choices/${c1Id}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`choice:${c1Id}`)).not.toBeNull();
    });

    it("should invalidate choice caches on delete", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/choices",
        payload: { text: "To Delete", is_correct: false, question_id: q1Id },
        headers: { "access-token": accessToken },
      });
      const choiceId = createRes.json().id;
      const key = `choice:${choiceId}`;

      await app.inject({
        method: "GET",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/choices/question/${q1Id}`,
        headers: { "access-token": accessToken },
      });
      expect(await valkeyRepository.get(key)).not.toBeNull();

      await app.inject({
        method: "DELETE",
        url: `/choices/${choiceId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(key)).toBeNull();
      expect(await valkeyRepository.get(`question:choices:${q1Id}`)).toBeNull();
    });

    it("should invalidate parent question collection on create", async () => {
      await app.inject({
        method: "GET",
        url: `/choices/question/${q1Id}`,
        headers: { "access-token": accessToken },
      });
      expect(
        await valkeyRepository.get(`question:choices:${q1Id}`),
      ).not.toBeNull();

      await app.inject({
        method: "POST",
        url: "/choices",
        payload: {
          text: "New C",
          is_correct: false,
          question_id: q1Id,
        },
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`question:choices:${q1Id}`)).toBeNull();
    });
  });
});
