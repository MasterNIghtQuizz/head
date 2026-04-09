import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ParticipantRoles, SessionStatus } from "common-contracts";
import { ParticipantService } from "./participant.service.js";
import {
  createSessionEntity,
  createParticipantEntity,
} from "./test-helpers.js";
import { TokenService } from "common-auth";

vi.mock("common-auth");

describe("ParticipantService unit tests", () => {
  /** @type {import('./participant.service.js').ParticipantService} */
  let participantService;
  /** @type {Record<keyof import('../core/ports/session.repository.js').ISessionRepository, import('vitest').Mock>} */
  let sessionRepositoryMock;
  /** @type {Record<keyof import('../core/ports/participant.repository.js').IParticipantRepository, import('vitest').Mock>} */
  let participantRepositoryMock;

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
    participantService = new ParticipantService(
      null,
      sessionRepositoryMock,
      participantRepositoryMock,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("joinSession", () => {
    it("should allow a participant to join an open session and return a game token", async () => {
      const data = {
        session_public_key: "session-123",
        participant_id: "participant-123",
        participant_nickname: "Player1",
      };

      const sessionEntity = createSessionEntity({
        status: SessionStatus.LOBBY,
      });
      const participantEntity = createParticipantEntity({
        id: data.participant_id,
        nickname: data.participant_nickname,
        role: ParticipantRoles.PLAYER,
        sessionId: sessionEntity.id,
      });

      const sessionSpy = vi
        .mocked(sessionRepositoryMock.findByPublicKey)
        .mockResolvedValue(sessionEntity);
      const participantSpy = vi
        .mocked(participantRepositoryMock.create)
        .mockResolvedValue(participantEntity);
      const signSpy = vi
        .mocked(TokenService.signGameToken)
        .mockReturnValue("game-token-123");

      const response = await participantService.joinSession(data);

      expect(sessionSpy).toHaveBeenCalledWith(data.session_public_key);
      expect(participantSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: ParticipantRoles.PLAYER,
          sessionId: sessionEntity.id,
          nickname: data.participant_nickname,
        }),
      );
      expect(signSpy).toHaveBeenCalled();
      expect(response).toEqual({
        participant_id: expect.any(String),
        game_token: "game-token-123",
      });
    });
  });

  describe("leaveSession", () => {
    it("should remove the participant from the session using participantId string", async () => {
      const participantId = "participant-123";
      const participantEntity = createParticipantEntity({ id: participantId });

      const findSpy = vi
        .mocked(participantRepositoryMock.find)
        .mockResolvedValue(participantEntity);
      const deleteSpy = vi
        .mocked(participantRepositoryMock.delete)
        .mockResolvedValue(undefined);

      await participantService.leaveSession(participantId);

      expect(findSpy).toHaveBeenCalledWith(participantId);
      expect(deleteSpy).toHaveBeenCalledWith(participantId);
    });

    it("should do nothing if participant is not found", async () => {
      const participantId = "non-existent";
      const findSpy = vi
        .mocked(participantRepositoryMock.find)
        .mockResolvedValue(null);
      const deleteSpy = vi.mocked(participantRepositoryMock.delete);

      await participantService.leaveSession(participantId);

      expect(findSpy).toHaveBeenCalledWith(participantId);
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
