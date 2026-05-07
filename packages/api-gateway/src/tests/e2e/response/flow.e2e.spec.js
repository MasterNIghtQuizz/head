// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Response E2E - Leaderboard and Stats Flow", () => {
  let app;
  let hostToken;
  let hostId;

  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60000 });
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

  it("should track responses and show correct leaderboard and stats", async () => {
    // 1. Create Quiz
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": hostToken },
      payload: { title: "Response E2E Quiz" },
    });
    const quizId = quizRes.json().id;
    expect(quizRes.statusCode).toBe(201);

    // 2. Add Question
    const q1Res = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Q1",
        type: "single",
        order_index: 0,
        timer_seconds: 30,
      },
    });
    const q1Id = q1Res.json().id;
    expect(q1Res.statusCode).toBe(201);

    // 3. Add Choices
    const c1Res = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q1Id, text: "Correct", is_correct: true },
    });
    const c1Id = c1Res.json().id;

    const c2Res = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q1Id, text: "Wrong", is_correct: false },
    });
    const c2Id = c2Res.json().id;
    expect(c2Res.statusCode).toBe(201);

    const c3Res = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q1Id, text: "Another Wrong", is_correct: false },
    });
    expect(c3Res.statusCode).toBe(201);

    // 4. Create Session
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

    // 5. Join Players
    const player1Res = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: { session_public_key: publicKey, participant_nickname: "P1" },
    });
    const p1Token = player1Res.json().game_token;
    const p1Id = player1Res.json().participant_id;

    const player2Res = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: { session_public_key: publicKey, participant_nickname: "P2" },
    });
    const p2Token = player2Res.json().game_token;
    const p2Id = player2Res.json().participant_id;

    // 6. Start Session
    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostGameToken },
    });

    // 7. Submit Responses (Wait a bit for Kafka/Async processing)
    // P1 submits correct
    const s1 = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": p1Token },
      payload: { choiceIds: [c1Id] },
    });
    expect(s1.statusCode).toBe(206);

    // P2 submits wrong
    const s2 = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": p2Token },
      payload: { choiceIds: [c2Id] },
    });
    expect(s2.statusCode).toBe(206);

    // Wait for Kafka processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 8. Verify Leaderboard (Host only)
    const leaderboardRes = await app.inject({
      method: "GET",
      url: `/responses/leaderboard/session/${sessionId}`,
      headers: { "game-token": hostGameToken },
    });
    expect(leaderboardRes.statusCode).toBe(200);
    const leaderboard = leaderboardRes.json();

    // P1 should be first with score 1, P2 score 0
    expect(leaderboard).toContainEqual({ participantId: p1Id, score: 1 });
    expect(leaderboard).toContainEqual({ participantId: p2Id, score: 0 });

    // 9. Verify Question Stats (Host only)
    const statsRes = await app.inject({
      method: "GET",
      url: `/responses/stats/question/${q1Id}?sessionId=${sessionId}`,
      headers: { "game-token": hostGameToken },
    });
    expect(statsRes.statusCode).toBe(200);
    const stats = statsRes.json();
    expect(stats).toContainEqual({ choiceId: c1Id, count: 1 });
    expect(stats).toContainEqual({ choiceId: c2Id, count: 1 });

    // 10. Verify Participant Responses (P1 seeing their own)
    const p1ResponsesRes = await app.inject({
      method: "GET",
      url: `/responses/participant/${p1Id}?sessionId=${sessionId}`,
      headers: { "game-token": p1Token },
    });
    expect(p1ResponsesRes.statusCode).toBe(200);
    expect(p1ResponsesRes.json().length).toBe(1);
    expect(p1ResponsesRes.json()[0].choiceId).toBe(c1Id);

    // 11. Verify Question Responses (Host only)
    const qResponsesRes = await app.inject({
      method: "GET",
      url: `/responses/question/${q1Id}?sessionId=${sessionId}`,
      headers: { "game-token": hostGameToken },
    });
    expect(qResponsesRes.statusCode).toBe(200);
    expect(qResponsesRes.json().length).toBe(2);

    // 12. Add a second question (QCM) to verify setup robustness
    const q2Res = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Q2 (Multi-Choice)",
        type: "single",
        order_index: 1,
        timer_seconds: 30,
      },
    });
    const q2Id = q2Res.json().id;

    // Add choices for Q2
    const q2c1Res = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q2Id, text: "Q2 Correct", is_correct: true },
    });
    const _q2c1Id = q2c1Res.json().id;

    const _q2c2Res = await app.inject({
      method: "POST",
      url: "/choices",
      headers: { "access-token": hostToken },
      payload: { question_id: q2Id, text: "Q2 Wrong", is_correct: false },
    });

    // 13. Add a third question (Buzzer)
    const q3Res = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Q3 (Buzzer)",
        type: "buzzer",
        order_index: 2,
        timer_seconds: 30,
      },
    });
    const _q3Id = q3Res.json().id;

    // 13. Move to Q2 then to Q3 (buzzer) — Q2 intentionally skipped for score integrity
    await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": hostGameToken },
    });

    await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": hostGameToken },
    });

    // 14. P1 Buzzes in
    const b1 = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": p1Token },
      payload: { choiceIds: [] },
    });
    expect(b1.statusCode).toBe(206);

    // 15. Host validates P1's buzzer as correct
    await app.inject({
      method: "POST",
      url: "/sessions/buzzer/answer",
      headers: { "game-token": hostGameToken },
      payload: { participantId: p1Id, isCorrect: true },
    });

    // Wait for Kafka
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 16. Verify Leaderboard (P1 should have 2 points now)
    const leaderboardRes2 = await app.inject({
      method: "GET",
      url: `/responses/leaderboard/session/${sessionId}`,
      headers: { "game-token": hostGameToken },
    });
    const leaderboard2 = leaderboardRes2.json();
    expect(leaderboard2).toContainEqual({ participantId: p1Id, score: 2 });
    expect(leaderboard2).toContainEqual({ participantId: p2Id, score: 0 });

    // 17. End Session
    await app.inject({
      method: "POST",
      url: "/sessions/end",
      headers: { "game-token": hostGameToken },
    });

    // Wait for Kafka (onSessionEnded clears responses)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 18. Verify Responses are cleared
    const leaderboardRes3 = await app.inject({
      method: "GET",
      url: `/responses/leaderboard/session/${sessionId}`,
      headers: { "game-token": hostGameToken },
    });
    expect(leaderboardRes3.json().length).toBe(0);
  });

  it("should reject unauthorized access to responses", async () => {
    // Create a quick session
    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": hostToken },
      payload: { title: "Auth Test Quiz" },
    });
    const quizId = quizRes.json().id;
    expect(quizRes.statusCode).toBe(201);

    // Add a question so session creation doesn't fail
    const qRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Auth Test Question",
        type: "single",
        order_index: 0,
        timer_seconds: 30,
      },
    });
    expect(qRes.statusCode).toBe(201);

    // Add a second question to satisfy ms-session validations if needed
    await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Auth Test Question 2",
        type: "single",
        order_index: 1,
        timer_seconds: 30,
      },
    });

    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    const { session_id: sessionId, public_key: publicKey } =
      createSessionRes.json();

    const playerRes = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: {
        session_public_key: publicKey,
        participant_nickname: "UnauthorizedPlayer",
      },
    });
    expect(playerRes.statusCode).toBe(200);
    const playerToken = playerRes.json().game_token;

    // Player tries to access leaderboard (should be forbidden)
    const leaderboardRes = await app.inject({
      method: "GET",
      url: `/responses/leaderboard/session/${sessionId}`,
      headers: { "game-token": playerToken },
    });
    expect(leaderboardRes.statusCode).toBe(403);

    // Player tries to access question stats (should be forbidden)
    const statsRes = await app.inject({
      method: "GET",
      url: `/responses/stats/question/00000000-0000-0000-0000-000000000000?sessionId=${sessionId}`,
      headers: { "game-token": playerToken },
    });
    expect(statsRes.statusCode).toBe(403);
  });
});
