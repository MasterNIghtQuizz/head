// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "@monorepo/api-gateway/app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session E2E (real) - host flow", () => {
  /** @type {import("fastify").FastifyInstance} */
  let app;
  /** @type {string} */
  let token;
  /** @type {string} */
  let hostId;

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();

    hostId = `host-${crypto.randomUUID()}`;

    const tokenRes = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: hostId, role: UserRole.USER },
    });
    token = tokenRes.json().token;
  });

  it("creates a quiz, adds a question+choice, then creates and fetches a session", async () => {
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: `Session Quiz ${Date.now()}` },
    });
    expect(quizRes.statusCode).toBe(201);
    const quizId = quizRes.json().id;

    const questionRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "Q1",
        type: "single",
        order_index: 1,
        timer_seconds: 10,
      },
    });
    expect(questionRes.statusCode).toBe(201);
    const questionId = questionRes.json().id;

    const choiceRes = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "A", is_correct: true },
    });
    expect(choiceRes.statusCode).toBe(201);

    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": token },
      payload: { quiz_id: quizId },
    });
    expect(createSessionRes.statusCode).toBe(201);

    const {
      session_id: sessionId,
      public_key: publicKey,
      game_token: gameToken,
    } = createSessionRes.json();
    expect(sessionId).toBeDefined();
    expect(publicKey).toBeDefined();
    expect(gameToken).toBeDefined();

    const getSessionRes = await app.inject({
      method: "GET",
      url: "/sessions/",
      headers: { "game-token": gameToken },
    });
    expect(getSessionRes.statusCode).toBe(200);
    expect(getSessionRes.json().session_id).toBe(sessionId);
  });
});
