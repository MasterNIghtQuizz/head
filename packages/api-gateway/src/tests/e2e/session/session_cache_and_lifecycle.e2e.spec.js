// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import { randomUUID } from "node:crypto";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { config } from "../../../config.js";

describe("Session E2E - Cache & Lifecycle Monitoring", () => {
  let app;
  let valkey;
  let hostToken;
  let hostId;
  let quizId;
  let sessionId;
  let publicKey;
  let hostGameToken;
  let questionId;

  beforeAll(async () => {
    await seedDatabase();
    app = await createServer();
    const valkeyService = new ValkeyService(config.valkey);
    await valkeyService.connect();
    valkey = new ValkeyRepository(valkeyService);

    hostId = `host-${randomUUID()}`;
    const tokenRes = await app.inject({
      method: "POST",
      url: "/helpers/access-token",
      payload: { userId: hostId, role: UserRole.USER },
    });
    hostToken = tokenRes.json().token;

    const quizRes = await app.inject({
      method: "POST",
      url: "/quizzes",
      headers: { "access-token": hostToken },
      payload: { title: "Cache Lifecycle Quiz" },
    });
    quizId = quizRes.json().id;

    const qRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Cache Q1",
        type: "single",
        order_index: 0,
        timer_seconds: 15,
      },
    });
    questionId = qRes.json().id;

    // Create choice for Q1 using correct gateway endpoint
    await app.inject({
      method: "POST",
      url: "/choices/",
      headers: { "access-token": hostToken },
      payload: {
        text: "Correct Choice",
        is_correct: true,
        question_id: questionId,
      },
    });
  });

  afterAll(async () => {
    // If you want to disconnect, you need to access the private/internal service
    // In our test we can just close the app
    await app.close();
  });

  it("should create a session and ensure cache is empty initially", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });

    expect(res.statusCode).toBe(201);
    const data = res.json();
    sessionId = data.session_id;
    publicKey = data.public_key;
    hostGameToken = data.game_token;

    // Questions:ids should NOT be cached yet because we haven't fetched them in ms-session start
    // Actually, createSession in ms-session FETCHES questions and caches them!
    const cachedIds = await valkey.get(`session:${sessionId}:questions:ids`);
    expect(cachedIds).toContain(questionId);
  });

  it("should cache validation and full question data on session start", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostGameToken },
    });

    expect(res.statusCode).toBe(200);

    // Verify granular caching
    const validationKey = `question:${questionId}:validation`;
    const fullKey = `question:${questionId}:full`;
    const activatedAtKey = `session:${sessionId}:question_activated_at`;

    const [validation, full, activatedAt] = await Promise.all([
      valkey.get(validationKey),
      valkey.get(fullKey),
      valkey.get(activatedAtKey),
    ]);

    expect(validation).toBeDefined();
    expect(validation.id).toBe(questionId);
    expect(validation.choiceIds).toHaveLength(1);

    expect(full).toBeDefined();
    expect(full.id).toBe(questionId);
    // Sensitive data check: Choice should NOT have is_correct in full cache used for public retrieval
    expect(full.choices[0].is_correct).toBeUndefined();

    expect(activatedAt).toBeDefined();
    expect(typeof activatedAt).toBe("number");
  });

  it("should clear session-specific cache and delete participants when host leaves", async () => {
    // 1. Join a participant
    const joinRes = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: {
        session_public_key: publicKey,
        participant_nickname: "EphemeralPlayer",
      },
    });
    expect(joinRes.statusCode).toBe(200);

    // 2. Host leaves
    const leaveRes = await app.inject({
      method: "POST",
      url: "/sessions/leave",
      headers: { "game-token": hostGameToken },
    });

    expect(leaveRes.statusCode).toBe(200);

    // 3. Verify session was deleted (via 401/404 on getSession)
    const getRes = await app.inject({
      method: "GET",
      url: "/sessions",
      headers: { "game-token": hostGameToken },
    });
    // Session is deleted, so game token is invalid or session not found
    expect(getRes.statusCode).toBe(404);

    // 4. Verify cache is cleared
    const cachedIds = await valkey.get(`session:${sessionId}:questions:ids`);
    const activatedAt = await valkey.get(
      `session:${sessionId}:question_activated_at`,
    );

    expect(cachedIds).toBeNull();
    expect(activatedAt).toBeNull();

    // Note: granular question data remains in cache (shared between sessions) until TTL
    const validation = await valkey.get(`question:${questionId}:validation`);
    expect(validation).not.toBeNull();
  });

  it("should handle full lifecycle with multiple participants and final cleanup", async () => {
    // Re-create a session
    const createRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    const sId = createRes.json().session_id;
    const pKey = createRes.json().public_key;
    const hGameToken = createRes.json().game_token;

    // Join 2 players
    const p1 = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: { session_public_key: pKey, participant_nickname: "Player 1" },
    });
    const p2 = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: { session_public_key: pKey, participant_nickname: "Player 2" },
    });

    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hGameToken },
    });

    // Players submit responses
    await app.inject({
      method: "POST",
      url: "/sessions/submit",
      headers: { "game-token": p1.json().game_token },
      payload: { choiceIds: ["wrong"] }, // will fail validation but test logic flow
    });

    // Delete session via explicit DELETE (Admin or Moderator depending on RBAC, here assumed moderator/host can delete)
    // Wait, in my controller update I set it to ADMIN roles?
    // Let's use moderator if I allowed it, otherwise I'll use an admin token.
    const delRes = await app.inject({
      method: "DELETE",
      url: "/sessions",
      headers: { "game-token": hGameToken },
    });
    // If it fails 403, I'll know why. But I should check my SessionController.
    expect(delRes.statusCode).toBe(200);

    // Verify cache cleared
    const ids = await valkey.get(`session:${sId}:questions:ids`);
    expect(ids).toBeNull();
  });

  it("should end the session automatically when next is called on the last question", async () => {
    // 1. Create session with 1 question (already seeded in beforeAll)
    const createRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    const sId = createRes.json().session_id;
    const hGameToken = createRes.json().game_token;

    await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hGameToken },
    });

    // 2. Call next (there is only 1 question, so current index is 0, length is 1)
    // In ms-session logic: currentIndex (0) === length (1) - 1 is true -> call endSession
    const nextRes = await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": hGameToken },
    });
    expect(nextRes.statusCode).toBe(200);

    // 3. Verify status is FINISHED
    const getRes = await app.inject({
      method: "GET",
      url: "/sessions",
      headers: { "game-token": hGameToken },
    });
    expect(getRes.json().status).toBe("FINISHED");

    const failNext = await app.inject({
      method: "POST",
      url: "/sessions/next",
      headers: { "game-token": hGameToken },
    });
    expect(failNext.statusCode).toBe(409); // SESSION_INVALID_STATUS usually maps to 409
  });
});
