import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ParticipantController } from "./participant.controller.js";

/**
 * @typedef {import('vitest').Mocked<import('../services/participant.service.js').ParticipantService>} ParticipantServiceMock
 */

describe("ParticipantController unit tests", () => {
  /** @type {import('./participant.controller.js').ParticipantController} */
  let controller;
  /** @type {ParticipantServiceMock} */
  let participantServiceMock;
  /** @type {import('fastify').FastifyReply} */
  let replyMock;

  beforeEach(() => {
    // @ts-ignore
    participantServiceMock = /** @type {ParticipantServiceMock} */ ({
      joinSession: vi.fn(),
      leaveSession: vi.fn(),
      submitResponse: vi.fn(),
    });
    controller = new ParticipantController(participantServiceMock);

    // @ts-ignore
    replyMock = /** @type {import('fastify').FastifyReply} */ ({
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("joinSession", () => {
    it("should return 200 and join data", async () => {
      const body = {
        session_public_key: "pub",
        participant_nickname: "nick",
      };
      const joinData = { participant_id: "p1", game_token: "gt" };

      vi.mocked(participantServiceMock.joinSession).mockResolvedValue(joinData);

      await controller.joinSession(
        /** @type {import('fastify').FastifyRequest} */ (
          // @ts-ignore
          /** @type {unknown} */ ({ body })
        ),
        replyMock,
      );

      expect(participantServiceMock.joinSession).toHaveBeenCalledWith(body);
      expect(replyMock.code).toHaveBeenCalledWith(200);
      expect(replyMock.send).toHaveBeenCalledWith(joinData);
    });
  });

  describe("leaveSession", () => {
    it("should extract participant id from token and call service", async () => {
      const headers = { "internal-token": "valid" };
      const payload = { participantId: "p1" };
      // @ts-ignore
      vi.spyOn(controller, "_getInternalPayload").mockReturnValue(payload);

      await controller.leaveSession(
        /** @type {import('fastify').FastifyRequest} */ (
          // @ts-ignore
          /** @type {unknown} */ ({ headers })
        ),
        replyMock,
      );

      expect(participantServiceMock.leaveSession).toHaveBeenCalledWith(
        payload.participantId,
      );
      expect(replyMock.code).toHaveBeenCalledWith(200);
    });
  });

  describe("submitResponse", () => {
    it("should extract payload, call service and return 206", async () => {
      const body = { choiceIds: ["c1"] };
      const payload = { sessionId: "s1", participantId: "p1" };

      // @ts-ignore
      vi.spyOn(controller, "_getInternalPayload").mockReturnValue(payload);
      vi.mocked(participantServiceMock.submitResponse).mockResolvedValue(
        undefined,
      );

      await controller.submitResponse(
        /** @type {import('fastify').FastifyRequest} */ (
          // @ts-ignore
          /** @type {unknown} */ ({ body })
        ),
        replyMock,
      );

      expect(participantServiceMock.submitResponse).toHaveBeenCalledWith({
        sessionId: payload.sessionId,
        participantId: payload.participantId,
        choiceIds: body.choiceIds,
      });
      expect(replyMock.code).toHaveBeenCalledWith(206);
    });
  });
});
