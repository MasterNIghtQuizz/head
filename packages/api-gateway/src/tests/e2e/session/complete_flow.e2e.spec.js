// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session E2E - Complete Game Flow", () => {
  let app;
  let hostToken;
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
    hostToken = tokenRes.json().token;
  });

  it("should handle a full game flow from quiz creation to multiple questions for 5 players", async () => {
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": hostToken },
      payload: { title: "E2E Complete Quiz" },
    });
    expect(quizRes.statusCode).toBe(201);
    const quizId = quizRes.json().id;

    const q1Res = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Question 1",
        type: "single",
        order_index: 0,
        timer_seconds: 5,
      },
    });
    const q1Id = q1Res.json().id;

    await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q1Id, text: "Correct 1", is_correct: true },
    });

    const q2Res = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Question 2",
        type: "single",
        order_index: 1,
        timer_seconds: 5,
      },
    });
    const q2Id = q2Res.json().id;

    await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q2Id, text: "Correct 2", is_correct: true },
    });

    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    expect(createSessionRes.statusCode).toBe(201);
    const {
      session_id: sessionId,
      public_key: publicKey,
      game_token: hostGameToken,
    } = createSessionRes.json();

    const nicknames = ["Player1", "Player2", "Player3", "Player4"];
    const playerTokens = [];

    for (const nickname of nicknames) {
      const joinRes = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: publicKey,
          participant_nickname: nickname,
        },
      });
      expect(joinRes.statusCode).toBe(200);
      playerTokens.push(joinRes.json().game_token);
    }

    const startRes = await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostGameToken },
    });
    expect(startRes.statusCode).toBe(200);

    const q1CurrentRes = await app.inject({
      method: "GET",
      url: "/sessions/current-question",
      headers: { "game-token": playerTokens[0] },
    });
    expect(q1CurrentRes.statusCode).toBe(200);
    const q1Data = q1CurrentRes.json();
    const correctChoiceId = q1Data.choices.find(
      (c) => c.text === "Correct 1",
    ).id;

    for (const pToken of playerTokens) {
      const submitRes = await app.inject({
        method: "POST",
        url: "/sessions/submit/",
        headers: { "game-token": pToken },
        payload: { choiceIds: [correctChoiceId] },
      });
      expect(submitRes.statusCode).toBe(206);
    }

    const nextRes = await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": hostGameToken },
    });
    expect(nextRes.statusCode).toBe(200);

    const q2CurrentRes = await app.inject({
      method: "GET",
      url: "/sessions/current-question",
      headers: { "game-token": playerTokens[3] },
    });
    expect(q2CurrentRes.statusCode).toBe(200);
    expect(q2CurrentRes.json().id).toBe(q2Id);
    const q2Data = q2CurrentRes.json();
    const q2CorrectChoiceId = q2Data.choices[0].id;

    const lateSubmitRes = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerTokens[0] },
      payload: { choiceIds: [q2CorrectChoiceId] },
    });
    expect(lateSubmitRes.statusCode).toBe(206);

    const badSessionRes = await app.inject({
      method: "GET",
      url: "/sessions/invalid-id",
      headers: { "access-token": hostToken },
    });
    expect(badSessionRes.statusCode).toBe(404);

    const unauthorizedRes = await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": playerTokens[0] },
    });
    expect(unauthorizedRes.statusCode).toBe(403);
  });
});
