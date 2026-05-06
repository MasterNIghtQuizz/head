// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session E2E Professional Stress Test", () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    try {
      await seedDatabase();
    } catch {
      console.warn("Infra check failed");
    }
  });

  beforeEach(async () => {
    app = await createServer();
    const adminId = `admin-${crypto.randomUUID()}`;
    const tokenRes = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: adminId, role: UserRole.ADMIN },
    });
    adminToken = tokenRes.json().token;
  });

  it("should handle massive parallel submissions in a real game scenario", async () => {
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": adminToken },
      payload: { title: "Stress Test Quiz" },
    });
    const quizId = quizRes.json().id;

    const questionRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": adminToken },
      payload: {
        quiz_id: quizId,
        label: "Stress Question",
        type: "single",
        order_index: 0,
        timer_seconds: 30,
      },
    });
    const questionId = questionRes.json().id;

    const choiceRes = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": adminToken },
      payload: {
        question_id: questionId,
        text: "Correct Answer",
        is_correct: true,
      },
    });
    const correctChoiceId = choiceRes.json().id;

    const sessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": adminToken },
      payload: { quiz_id: quizId },
    });
    const {
      session_id: sessionId,
      public_key: publicKey,
      game_token: hostToken,
    } = sessionRes.json();

    const playerCount = 20;
    const playerTokens = [];

    for (let i = 0; i < playerCount; i++) {
      const joinRes = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: publicKey,
          participant_nickname: `Player_${i}`,
        },
      });
      playerTokens.push(joinRes.json().game_token);
    }

    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostToken },
    });

    const currentQuestionRes = await app.inject({
      method: "GET",
      url: "/sessions/current-question",
      headers: { "game-token": playerTokens[0] },
    });
    expect(currentQuestionRes.json().question_id).toBe(questionId);

    const submissionPromises = playerTokens.map((pToken) =>
      app.inject({
        method: "POST",
        url: "/sessions/submit/",
        headers: { "game-token": pToken },
        payload: { choiceIds: [correctChoiceId] },
      }),
    );

    const submissionResults = await Promise.all(submissionPromises);

    submissionResults.forEach((res) => {
      expect(res.statusCode).toBe(206);
    });
  });
});
