import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionService } from "./session.service.js";
import { ParticipantRoles } from "../core/entities/participant-roles.js";

/**
 * @typedef {import('vitest').Mock} Mock
 */

describe("SessionService unit tests", () => {
  /** @type SessionService */
  let sessionService;

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
    sessionService = new SessionService(
      null,
      sessionRepositoryMock,
      participantRepositoryMock,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("should create a session and add the host as a participant", async () => {
      const data = {
        host_id: "host-123",
        quiz_id: "quiz-123",
      };

      sessionRepositoryMock.create.mockImplementation(async (entity) => entity);
      participantRepositoryMock.create.mockImplementation(
        async (entity) => entity,
      );

      const response = await sessionService.createSession(data);

      expect(sessionRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hostId: data.host_id,
          quizzId: data.quiz_id,
        }),
      );
      expect(participantRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: data.host_id,
          role: ParticipantRoles.ADMIN,
          sessionId: expect.any(String),
          nickname: "Host",
          socketId: "",
        }),
      );

      expect(response).toEqual(
        expect.objectContaining({
          session_id: expect.any(String),
          public_key: expect.any(String),
        }),
      );
    });
  });
});
