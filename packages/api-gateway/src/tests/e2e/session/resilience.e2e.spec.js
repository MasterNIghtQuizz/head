// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session Resilience E2E", () => {
  let app;
  let token;
  let hostId;

  beforeAll(async () => {
    try {
      await seedDatabase();
    } catch {
      console.warn("Infra down");
    }
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

  it("should return 400 when submitting response for expired question", async () => {
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": token },
      payload: { title: "Resilience Quiz" },
    });
    const quizId = quizRes.json().id;

    const questionRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": token },
      payload: {
        quiz_id: quizId,
        label: "Q1",
        type: "single",
        order_index: 0,
        timer_seconds: 1,
      },
    });
    const questionId = questionRes.json().id;

    const choiceRes = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": token },
      payload: { question_id: questionId, text: "A", is_correct: true },
    });
    const choiceId = choiceRes.json().id;

    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": token },
      payload: { quiz_id: quizId },
    });
    const { game_token: gameToken } = createSessionRes.json();

    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": gameToken },
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const submitRes = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": gameToken },
      payload: { choiceIds: [choiceId] },
    });

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.json().message).toContain("timed out");
  });
});
