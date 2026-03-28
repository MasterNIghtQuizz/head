import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ParticipantRoles } from "../core/entities/participant-roles.js";
import { SessionEntity } from "../core/entities/session.entity.js";
import { SessionStatus } from "../core/entities/session-status.js";
import { ParticipantService } from "./participant.service.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */
describe("ParticipantService unit tests", () => {
  /** @type ParticipantService */
  let participantService;

  /** @type {{ create: Mock, findByPublicKey: Mock, update: Mock, delete: Mock, find: Mock }} */
  let sessionRepositoryMock;

  /** @type {{ create: Mock, find: Mock, delete: Mock, update: Mock, findBySessionId: Mock }} */
  let participantRepositoryMock;

  beforeEach(() => {
    sessionRepositoryMock = {
      create: vi.fn(),
      findByPublicKey: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
    };
    participantRepositoryMock = {
      create: vi.fn(),
      find: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findBySessionId: vi.fn(),
    };
    participantService = new ParticipantService(
      null,
      sessionRepositoryMock,
      participantRepositoryMock,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("joinSession", () => {
    it("should allow a participant to join an open session", async () => {
      const data = {
        session_public_key: "session-123",
        participant_id: "participant-123",
        participant_nickname: "Player1",
      };

      sessionRepositoryMock.findByPublicKey.mockImplementation(
        async (publicKey) =>
          new SessionEntity({
            id: "session-123",
            publicKey,
            status: SessionStatus.LOBBY,
            currentQuestionId: "",
            hostId: "host-123",
            quizzId: "quiz-123",
          }),
      );
      participantRepositoryMock.create.mockImplementation(
        async (entity) => entity,
      );

      const response = await participantService.joinSession(data);

      expect(sessionRepositoryMock.findByPublicKey).toHaveBeenCalledWith(
        data.session_public_key,
      );
      expect(participantRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: data.participant_id,
          role: ParticipantRoles.PLAYER,
          sessionId: "session-123",
          nickname: data.participant_nickname,
          socketId: "",
        }),
      );
      expect(response).toEqual({ participant_id: data.participant_id });
    });
  });

  describe("leaveSession", () => {
    it("should remove the participant from the session", async () => {
      const data = {
        participant_id: "participant-123",
        session_public_key: "session-123",
      };

      participantRepositoryMock.find.mockImplementation(
        async (id) =>
          new ParticipantEntity({
            id,
            role: ParticipantRoles.PLAYER,
            sessionId: "session-123",
            nickname: "Player1",
            socketId: "",
          }),
      );
      participantRepositoryMock.delete.mockImplementation(async (id) => {});

      await participantService.leaveSession(data);

      expect(participantRepositoryMock.find).toHaveBeenCalledWith(
        data.participant_id,
      );
      expect(participantRepositoryMock.delete).toHaveBeenCalledWith(
        data.participant_id,
      );
    });
  });
});
