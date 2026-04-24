// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session E2E - Response Idempotency", () => {
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

  it("should block duplicate responses and maintain status after refresh", async () => {
    // 1. Setup Quiz
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": hostToken },
      payload: { title: "Idempotency Quiz" },
    });
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
        timer_seconds: 10,
      },
    });
    const q1Id = q1Res.json().id;

    const choiceRes = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q1Id, text: "Choice A", is_correct: true },
    });
    const choiceId = choiceRes.json().id;

    // 2. Setup Session
    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    const { public_key: publicKey, game_token: hostGameToken } =
      createSessionRes.json();

    // 3. Player Joins
    const joinRes = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: {
        session_public_key: publicKey,
        participant_nickname: "Player1",
      },
    });
    const playerGameToken = joinRes.json().game_token;

    // 4. Start Session
    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostGameToken },
    });

    // 5. Submit First Response (Success)
    const submit1Res = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerGameToken },
      payload: { choiceIds: [choiceId] },
    });
    expect(submit1Res.statusCode).toBe(206);

    // 6. Submit Second Response (Conflict)
    const submit2Res = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerGameToken },
      payload: { choiceIds: [choiceId] },
    });
    expect(submit2Res.statusCode).toBe(409);
    expect(submit2Res.json().message).toContain("already responded");

    // 7. Fetch Session - Check has_answered
    const getSessionRes = await app.inject({
      method: "GET",
      url: "/sessions/",
      headers: { "game-token": playerGameToken },
    });
    expect(getSessionRes.statusCode).toBe(200);
    expect(getSessionRes.json().has_answered).toBe(true);
  });
});
