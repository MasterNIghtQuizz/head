import { describe, it, expect, beforeAll } from "vitest";
import { createServer } from "../../../app.js";
import { seedDatabase } from "../utils/test-utils.js";
import { UserRole } from "common-auth";
import { randomUUID } from "node:crypto";

describe("Session E2E - Comprehensive Testing", () => {
  let app: any;
  let hostToken: string;
  let hostId: string;
  let quizId: string;
  let sessionId: string;
  let publicKey: string;
  let hostGameToken: string;

  beforeAll(async () => {
    await seedDatabase();
    app = await createServer();

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
      payload: { title: "Comprehensive Test Quiz" },
    });
    quizId = quizRes.json().id;

    await app.inject({
      method: "POST",
      url: "/questions",
      headers: { "access-token": hostToken },
      payload: {
        quiz_id: quizId,
        label: "Q1",
        type: "single",
        order_index: 0,
        timer_seconds: 10,
      },
    });
  });

  describe("POST /sessions (Create Session)", () => {
    it("should fail if no access token is provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { quiz_id: quizId },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should fail if quiz_id is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions",
        headers: { "access-token": hostToken },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("should fail if quiz_id does not exist", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions",
        headers: { "access-token": hostToken },
        payload: { quiz_id: crypto.randomUUID() },
      });
      expect(res.statusCode).toBe(404);
    });

    it("should create a session successfully", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions",
        headers: { "access-token": hostToken },
        payload: { quiz_id: quizId },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.session_id).toBeDefined();
      expect(data.public_key).toBeDefined();
      expect(data.game_token).toBeDefined();

      sessionId = data.session_id;
      publicKey = data.public_key;
      hostGameToken = data.game_token;
    });
  });

  describe("POST /sessions/join", () => {
    it("should fail if session_public_key is invalid", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: "INVALID",
          participant_nickname: "Player",
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("should fail if participant_nickname is missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: publicKey,
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("should join successfully and return a game token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: publicKey,
          participant_nickname: "ExcellentPlayer",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().game_token).toBeDefined();
      expect(res.json().participant_id).toBeDefined();
    });
  });

  describe("GET /sessions (Get Detailed Session)", () => {
    it("should fail without game token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/sessions",
      });
      expect(res.statusCode).toBe(401);
    });

    it("should allow moderator to see detailed session", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/sessions",
        headers: { "game-token": hostGameToken },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.session_id).toBe(sessionId);
      expect(data.participants).toBeDefined();
      expect(data.participants.length).toBeGreaterThan(0);
    });
  });

  describe("POST /sessions/start", () => {
    it("should fail if called by a non-moderator (player)", async () => {
      const joinRes = await app.inject({
        method: "POST",
        url: "/sessions/join",
        payload: {
          session_public_key: publicKey,
          participant_nickname: "RegularPlayer",
        },
      });
      const playerToken = joinRes.json().game_token;

      const res = await app.inject({
        method: "POST",
        url: "/sessions/start",
        headers: { "game-token": playerToken },
      });
      expect(res.statusCode).toBe(403);
    });

    it("should start the session successfully by moderator", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/start",
        headers: { "game-token": hostGameToken },
      });
      expect(res.statusCode).toBe(200);
    });

    it("should fail to start a session that is already started", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/start",
        headers: { "game-token": hostGameToken },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe("GET /sessions/current-question", () => {
    it("should return the first question after start", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/sessions/current-question",
        headers: { "game-token": hostGameToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).not.toBeNull();
      expect(res.json().label).toBe("Q1");
    });
  });

  describe("POST /sessions/next", () => {
    it("should fail if no more questions (only 1 in this quiz)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/sessions/next",
        headers: { "game-token": hostGameToken },
      });
      expect(res.statusCode).toBe(200);

      const sessionRes = await app.inject({
        method: "GET",
        url: "/sessions",
        headers: { "game-token": hostGameToken },
      });
      expect(sessionRes.json().status).toBe("FINISHED");
    });
  });

  describe("POST /sessions/end", () => {
    it("should end session", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/sessions",
        headers: { "access-token": hostToken },
        payload: { quiz_id: quizId },
      });
      const newHostToken = createRes.json().game_token;

      const res = await app.inject({
        method: "POST",
        url: "/sessions/end",
        headers: { "game-token": newHostToken },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
