import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionService } from "./session.service.js";
import { ParticipantRoles, SessionStatus } from "common-contracts";
import {
  createSessionEntity,
  createParticipantEntity,
} from "./test-helpers.js";
import { CryptoService } from "common-crypto";
import { call } from "common-axios";
import { TokenService } from "common-auth";

vi.mock("common-crypto");
vi.mock("common-axios");
vi.mock("common-auth");

describe("SessionService unit tests", () => {
  /** @type {import('./session.service.js').SessionService} */
  let sessionService;
  /** @type {Record<keyof import('../core/ports/session.repository.js').ISessionRepository, import('vitest').Mock>} */
  let sessionRepositoryMock;
  /** @type {Record<keyof import('../core/ports/participant.repository.js').IParticipantRepository, import('vitest').Mock>} */
  let participantRepositoryMock;
  /** @type {Record<keyof import('common-valkey').ValkeyRepository, import('vitest').Mock>} */
  let valkeyRepositoryMock;

  beforeEach(() => {
    sessionRepositoryMock = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findByPublicKey: vi.fn(),
    };
    participantRepositoryMock = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findBySessionId: vi.fn(),
    };
    valkeyRepositoryMock = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };
    sessionService = new SessionService(
      null,
      sessionRepositoryMock,
      participantRepositoryMock,
      valkeyRepositoryMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    it("should create a session, cache questions in valkey, and add host as participant", async () => {
      const data = { quiz_id: "quiz-123" };
      const headers = { "internal-token": "valid-token" };
      const quizData = { questions: [{ id: "q1" }] };
      const tokenPayload = { userId: "host-123" };
      const sessionEntity = createSessionEntity({
        quizzId: data.quiz_id,
        hostId: tokenPayload.userId,
      });
      const hostEntity = createParticipantEntity({
        role: ParticipantRoles.HOST,
        sessionId: sessionEntity.id,
      });

      const callSpy = vi.mocked(call).mockResolvedValue(quizData);
      const verifySpy = vi
        .mocked(CryptoService.verify)
        .mockReturnValue(tokenPayload);
      const signSpy = vi
        .mocked(TokenService.signGameToken)
        .mockReturnValue("game-token-123");
      const sessionCreateSpy = vi
        .mocked(sessionRepositoryMock.create)
        .mockResolvedValue(sessionEntity);
      const participantCreateSpy = vi
        .mocked(participantRepositoryMock.create)
        .mockResolvedValue(hostEntity);
      const valkeySpy = vi
        .mocked(valkeyRepositoryMock.set)
        .mockResolvedValue(undefined);

      const response = await sessionService.createSession(data, headers);

      expect(callSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quizId: data.quiz_id },
          headers: { "internal-token": headers["internal-token"] },
        }),
      );
      expect(verifySpy).toHaveBeenCalled();
      expect(sessionCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quizzId: data.quiz_id,
          hostId: tokenPayload.userId,
          status: SessionStatus.LOBBY,
        }),
      );
      expect(valkeySpy).toHaveBeenCalledWith(
        `session:${sessionEntity.id}:questions`,
        quizData.questions,
      );
      expect(participantCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: ParticipantRoles.HOST,
          sessionId: sessionEntity.id,
        }),
      );
      expect(signSpy).toHaveBeenCalled();
      expect(response).toEqual({
        session_id: sessionEntity.id,
        public_key: sessionEntity.publicKey,
        game_token: "game-token-123",
      });
    });
  });

  describe("getSession", () => {
    it("should return the session mapped to DTO", async () => {
      const sessionId = "s1";
      const sessionEntity = createSessionEntity({ id: sessionId });
      const participants = [createParticipantEntity({ id: "p1" })];

      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(sessionEntity);
      vi.mocked(participantRepositoryMock.findBySessionId).mockResolvedValue(
        participants,
      );

      const result = await sessionService.getSession(sessionId);

      expect(sessionRepositoryMock.find).toHaveBeenCalledWith(sessionId);
      expect(result.session_id).toBe(sessionId);
    });

    it("should throw SESSION_NOT_FOUND if session does not exist", async () => {
      vi.mocked(sessionRepositoryMock.find).mockResolvedValue(null);
      await expect(sessionService.getSession("none")).rejects.toThrow();
    });
  });

  describe("createSession errors", () => {
    it("should throw QUIZZ_NOT_FOUND if quiz service fails", async () => {
      vi.mocked(call).mockRejectedValue(new Error("Failed"));
      await expect(
        sessionService.createSession(
          { quiz_id: "q" },
          { "internal-token": "t" },
        ),
      ).rejects.toThrow();
    });

    it("should throw UnauthorizedError if token has no userId", async () => {
      vi.mocked(call).mockResolvedValue({ questions: [{ id: "1" }] });
      vi.mocked(CryptoService.verify).mockReturnValue({});
      await expect(
        sessionService.createSession(
          { quiz_id: "q" },
          { "internal-token": "t" },
        ),
      ).rejects.toThrow();
    });
  });
});
