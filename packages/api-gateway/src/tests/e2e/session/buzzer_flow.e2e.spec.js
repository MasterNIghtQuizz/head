// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import crypto from "node:crypto";

describe("Session E2E - Buzzer flow", () => {
  let app;
  let hostToken;
  let hostGameToken;
  let publicKey;
  let playerOne;
  let playerTwo;

  async function waitForAnswerableParticipant(participantIds, isCorrect) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      for (const participantId of participantIds) {
        const answerRes = await app.inject({
          method: "POST",
          url: "/sessions/buzzer/answer/",
          headers: { "game-token": hostGameToken },
          payload: { participantId, isCorrect },
        });

        if (answerRes.statusCode === 200) {
          return participantId;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("No answerable buzzer participant found");
  }

  async function ensureCurrentQuestionIsBuzzer() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const questionRes = await app.inject({
        method: "GET",
        url: "/sessions/current-question/",
        headers: { "game-token": hostGameToken },
      });
      expect(questionRes.statusCode).toBe(200);
      const question = questionRes.json();
      if (question?.question_id) {
        expect(question.label).toBeDefined();
        expect(question.type).toBe("buzzer");
        expect(question.timer_seconds).toBeDefined();
        expect(Array.isArray(question.choices)).toBe(true);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Current buzzer question was not available");
  }

  beforeAll(async () => {
    await seedDatabase();
  });

  beforeEach(async () => {
    app = await createServer();

    const hostId = `host-${crypto.randomUUID()}`;
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
      payload: { title: `Buzzer Quiz ${Date.now()}` },
    });
    expect(quizRes.statusCode).toBe(201);
    const quizId = quizRes.json().id;

    const questionRes = await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Buzzer Question",
        type: "buzzer",
        order_index: 0,
        timer_seconds: 15,
      },
    });
    expect(questionRes.statusCode).toBe(201);

    const createSessionRes = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: { "access-token": hostToken },
      payload: { quiz_id: quizId },
    });
    expect(createSessionRes.statusCode).toBe(201);
    hostGameToken = createSessionRes.json().game_token;
    publicKey = createSessionRes.json().public_key;

    const joinOneRes = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: {
        session_public_key: publicKey,
        participant_nickname: "PlayerOne",
      },
    });
    expect(joinOneRes.statusCode).toBe(200);
    playerOne = joinOneRes.json();

    const joinTwoRes = await app.inject({
      method: "POST",
      url: "/sessions/join",
      payload: {
        session_public_key: publicKey,
        participant_nickname: "PlayerTwo",
      },
    });
    expect(joinTwoRes.statusCode).toBe(200);
    playerTwo = joinTwoRes.json();

    const startRes = await app.inject({
      method: "POST",
      url: "/sessions/start",
      headers: { "game-token": hostGameToken },
    });
    expect(startRes.statusCode).toBe(200);
  });

  it("accepts buzz submissions and lets host answer buzzers", async () => {
    await ensureCurrentQuestionIsBuzzer();

    const p1Buzz = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerOne.game_token },
      payload: { choiceIds: [] },
    });
    expect(p1Buzz.statusCode).toBe(206);

    const p2Buzz = await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerTwo.game_token },
      payload: { choiceIds: [] },
    });
    expect(p2Buzz.statusCode).toBe(206);

    const firstAnsweredParticipantId = await waitForAnswerableParticipant(
      [playerOne.participant_id, playerTwo.participant_id],
      false,
    );
    const secondParticipantId =
      firstAnsweredParticipantId === playerOne.participant_id
        ? playerTwo.participant_id
        : playerOne.participant_id;

    const secondAnsweredParticipantId = await waitForAnswerableParticipant(
      [secondParticipantId],
      true,
    );

    expect([playerOne.participant_id, playerTwo.participant_id]).toContain(
      firstAnsweredParticipantId,
    );
    expect(secondAnsweredParticipantId).toBe(secondParticipantId);
  });

  it("rejects wrong buzzer candidate when forcing unknown participant", async () => {
    await ensureCurrentQuestionIsBuzzer();

    await app.inject({
      method: "POST",
      url: "/sessions/submit/",
      headers: { "game-token": playerOne.game_token },
      payload: { choiceIds: [] },
    });

    const response = await app.inject({
      method: "POST",
      url: "/sessions/buzzer/answer/",
      headers: { "game-token": hostGameToken },
      payload: { participantId: crypto.randomUUID(), isCorrect: false },
    });

    expect([400, 401, 409]).toContain(response.statusCode);
  });

  it("rejects buzzer answer without game token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/sessions/buzzer/answer/",
      payload: { participantId: playerOne.participant_id, isCorrect: true },
    });
    expect(response.statusCode).toBe(401);
  });

  it("forbids player token on buzzer answer endpoint", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/sessions/buzzer/answer/",
      headers: { "game-token": playerOne.game_token },
      payload: { participantId: playerOne.participant_id, isCorrect: true },
    });
    expect(response.statusCode).toBe(403);
  });
});
