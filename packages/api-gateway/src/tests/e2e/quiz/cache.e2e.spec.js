// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { config } from "../../../config.js";
import { seedDatabase } from "../utils/test-utils.js";

describe("Technical Quiz - Full E2E & Cache Cascade", () => {
  let app;
  let accessToken;
  let valkeyService;
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
      payload: { userId: "e2e-admin", role: "admin" },
    });
    accessToken = tokenResponse.json().token;
  });

  afterAll(async () => {
    await valkeyService.disconnect();
  });

  beforeEach(async () => {
    await valkeyRepository.delByPattern("*");
  });

  describe("1. Quiz Endpoints & Cache", () => {
    it("should handle full quiz lifecycle", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/quizzes",
        headers: { "access-token": accessToken },
        payload: { title: "Lifecycle Quiz", description: "Test" },
      });
      const qId = create.json().id;
      expect(create.statusCode).toBe(201);

      await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/quizzes/${qId}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get("quizzes:all")).not.toBeNull();
      expect(await valkeyRepository.get(`quiz:${qId}`)).not.toBeNull();

      const update = await app.inject({
        method: "PUT",
        url: `/quizzes/${qId}`,
        headers: { "access-token": accessToken },
        payload: { title: "Updated Lifecycle" },
      });
      expect(update.statusCode).toBe(200);

      expect(await valkeyRepository.get("quizzes:all")).toBeNull();
      expect(await valkeyRepository.get(`quiz:${qId}`)).toBeNull();
    });
  });

  describe("2. Question Endpoints & Cache", () => {
    it("should handle question operations and parent invalidation", async () => {
      const quiz = (
        await app.inject({
          method: "POST",
          url: "/quizzes",
          headers: { "access-token": accessToken },
          payload: { title: "Q Quiz" },
        })
      ).json();

      const createQ = await app.inject({
        method: "POST",
        url: "/questions",
        headers: { "access-token": accessToken },
        payload: {
          label: "What is AI?",
          type: "single",
          order_index: 1,
          timer_seconds: 20,
          quiz_id: quiz.id,
        },
      });
      const qnId = createQ.json().id;
      expect(createQ.statusCode).toBe(201);

      await app.inject({
        method: "GET",
        url: `/questions/quiz/${quiz.id}`,
        headers: { "access-token": accessToken },
      });
      expect(
        await valkeyRepository.get(`quiz:questions:${quiz.id}`),
      ).not.toBeNull();

      await app.inject({
        method: "DELETE",
        url: `/questions/${qnId}`,
        headers: { "access-token": accessToken },
      });
      expect(
        await valkeyRepository.get(`quiz:questions:${quiz.id}`),
      ).toBeNull();
    });
  });

  describe("3. Choice Endpoints & Cache", () => {
    it("should invalidate the entire hierarchy when a choice is modified", async () => {
      const qz = (
        await app.inject({
          method: "POST",
          url: "/quizzes",
          headers: { "access-token": accessToken },
          payload: { title: "H" },
        })
      ).json();
      const qn = (
        await app.inject({
          method: "POST",
          url: "/questions",
          headers: { "access-token": accessToken },
          payload: {
            label: "Q",
            type: "single",
            order_index: 1,
            timer_seconds: 10,
            quiz_id: qz.id,
          },
        })
      ).json();
      const ch = (
        await app.inject({
          method: "POST",
          url: "/choices",
          headers: { "access-token": accessToken },
          payload: { text: "C", is_correct: true, question_id: qn.id },
        })
      ).json();

      await app.inject({
        method: "GET",
        url: `/quizzes/${qz.id}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/questions/${qn.id}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`quiz:${qz.id}`)).not.toBeNull();

      await app.inject({
        method: "PUT",
        url: `/choices/${ch.id}`,
        headers: { "access-token": accessToken },
        payload: { text: "Updated Choice", is_correct: false },
      });

      expect(await valkeyRepository.get(`quiz:${qz.id}`)).toBeNull();
      expect(await valkeyRepository.get(`question:${qn.id}`)).toBeNull();
    });
  });

  describe("4. Delete Cascade - Question Level", () => {
    it("should wipe question and its choices from DB and Cache when Question is deleted", async () => {
      const qz = (
        await app.inject({
          method: "POST",
          url: "/quizzes",
          headers: { "access-token": accessToken },
          payload: { title: "Q-Level Delete" },
        })
      ).json();
      const qn = (
        await app.inject({
          method: "POST",
          url: "/questions",
          headers: { "access-token": accessToken },
          payload: {
            label: "Q1",
            type: "single",
            order_index: 1,
            timer_seconds: 10,
            quiz_id: qz.id,
          },
        })
      ).json();
      const ch = (
        await app.inject({
          method: "POST",
          url: "/choices",
          headers: { "access-token": accessToken },
          payload: { text: "C1", is_correct: true, question_id: qn.id },
        })
      ).json();

      await app.inject({
        method: "GET",
        url: `/questions/${qn.id}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/choices/${ch.id}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/questions/quiz/${qz.id}`,
        headers: { "access-token": accessToken },
      });

      const del = await app.inject({
        method: "DELETE",
        url: `/questions/${qn.id}`,
        headers: { "access-token": accessToken },
      });
      expect(del.statusCode).toBe(204);

      const checkQn = await app.inject({
        method: "GET",
        url: `/questions/${qn.id}`,
        headers: { "access-token": accessToken },
      });
      const checkCh = await app.inject({
        method: "GET",
        url: `/choices/${ch.id}`,
        headers: { "access-token": accessToken },
      });
      expect(checkQn.statusCode).toBe(404);
      expect(checkCh.statusCode).toBe(404);

      expect(await valkeyRepository.get(`question:${qn.id}`)).toBeNull();
      expect(await valkeyRepository.get(`choice:${ch.id}`)).toBeNull();
      expect(await valkeyRepository.get(`quiz:questions:${qz.id}`)).toBeNull();
      expect(await valkeyRepository.get("questions:all")).toBeNull();
    });
  });

  describe("5. Delete Cascade - Choice Level", () => {
    it("should invalidate parent question and quiz cache when a Choice is deleted", async () => {
      const qz = (
        await app.inject({
          method: "POST",
          url: "/quizzes",
          headers: { "access-token": accessToken },
          payload: { title: "C-Level Delete" },
        })
      ).json();
      const qn = (
        await app.inject({
          method: "POST",
          url: "/questions",
          headers: { "access-token": accessToken },
          payload: {
            label: "Q1",
            type: "single",
            order_index: 1,
            timer_seconds: 10,
            quiz_id: qz.id,
          },
        })
      ).json();
      const ch = (
        await app.inject({
          method: "POST",
          url: "/choices",
          headers: { "access-token": accessToken },
          payload: { text: "C1", is_correct: true, question_id: qn.id },
        })
      ).json();

      await app.inject({
        method: "GET",
        url: `/quizzes/${qz.id}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/questions/${qn.id}`,
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: `/question:choices:${qn.id}`,
        headers: { "access-token": accessToken },
      });

      await app.inject({
        method: "DELETE",
        url: `/choices/${ch.id}`,
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get(`choice:${ch.id}`)).toBeNull();
      expect(await valkeyRepository.get(`question:${qn.id}`)).toBeNull();
      expect(await valkeyRepository.get(`quiz:${qz.id}`)).toBeNull();
      expect(
        await valkeyRepository.get(`question:choices:${qn.id}`),
      ).toBeNull();
    });
  });

  describe("6. Global List Invalidation", () => {
    it("should clear all global list keys on any modification", async () => {
      await app.inject({
        method: "GET",
        url: "/quizzes",
        headers: { "access-token": accessToken },
      });
      await app.inject({
        method: "GET",
        url: "/choices",
        headers: { "access-token": accessToken },
      });

      expect(await valkeyRepository.get("quizzes:all")).not.toBeNull();
      expect(await valkeyRepository.get("choices:all")).not.toBeNull();

      await app.inject({
        method: "POST",
        url: "/quizzes",
        headers: { "access-token": accessToken },
        payload: { title: "Invalidator" },
      });

      expect(await valkeyRepository.get("quizzes:all")).toBeNull();
    });
  });
});
