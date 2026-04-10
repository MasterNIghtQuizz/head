import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionController } from "./session.controller.js";
// @ts-ignore
import { createSessionEntity } from "../services/test-helpers.js";

/**
 * @typedef {import('vitest').Mocked<import('../services/session.service.js').SessionService>} SessionServiceMock
 */

describe("SessionController unit tests", () => {
  /** @type {import('./session.controller.js').SessionController} */
  let controller;
  /** @type {SessionServiceMock} */
  let sessionServiceMock;
  /** @type {import('fastify').FastifyReply} */
  let replyMock;

  beforeEach(() => {
    // @ts-ignore
    sessionServiceMock = /** @type {SessionServiceMock} */ ({
      createSession: vi.fn(),
      getSession: vi.fn(),
      startSession: vi.fn(),
      endSession: vi.fn(),
      deleteSession: vi.fn(),
    });
    controller = new SessionController(sessionServiceMock);

    // @ts-ignore
    replyMock = /** @type {import('fastify').FastifyReply} */ ({
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    it("should return 201 and the created session", async () => {
      const body = { quiz_id: "quiz-123" };
      const headers = { "internal-token": "valid" };
      const sessionData = { session_id: "s1", game_token: "gt" };

      vi.mocked(sessionServiceMock.createSession).mockResolvedValue(
        // @ts-ignore
        sessionData,
      );

      await controller.createSession(
        /** @type {import('fastify').FastifyRequest} */ (
          // @ts-ignore
          /** @type {unknown} */ ({ body, headers })
        ),
        replyMock,
      );

      expect(sessionServiceMock.createSession).toHaveBeenCalledWith(
        body,
        headers,
      );
      expect(replyMock.code).toHaveBeenCalledWith(201);
      expect(replyMock.send).toHaveBeenCalledWith(sessionData);
    });

    it("should return 400 if validation fails", async () => {
      const body = {}; // Invalid body
      await controller.createSession(
        /** @type {import('fastify').FastifyRequest} */ (
          // @ts-ignore
          /** @type {unknown} */ ({ body, headers: {} })
        ),
        replyMock,
      );
      expect(replyMock.code).toHaveBeenCalledWith(400);
    });
  });

  describe("getSession", () => {
    it("should extract session id from token and return session", async () => {
      const headers = { "internal-token": "valid" };
      const payload = { sessionId: "s1", userId: "host-123" };
      // @ts-ignore
      vi.spyOn(controller, "_getInternalPayload").mockReturnValue(payload);
      // @ts-ignore
      vi.mocked(sessionServiceMock.getSession).mockResolvedValue({ id: "s1" });

      await controller.getSession(
        /** @type {import('fastify').FastifyRequest} */ (
          /** @type {unknown} */ ({ headers })
        ),
        replyMock,
      );

      expect(sessionServiceMock.getSession).toHaveBeenCalledWith(
        payload.sessionId,
      );
      expect(replyMock.code).toHaveBeenCalledWith(200);
    });
  });
});
