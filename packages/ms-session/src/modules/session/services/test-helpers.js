import { SessionEntity } from "../core/entities/session.entity.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles, SessionStatus } from "common-contracts";

/**
 * @param {Partial<import("../infra/models/session.model.js").SessionModel>} overrides
 * @returns {import("../infra/models/session.model.js").SessionModel}
 */
export const createSessionModel = (overrides = {}) => {
  return {
    id: "session-123",
    public_key: "pub-key-123",
    status: SessionStatus.CREATED,
    current_question_id: undefined,
    quizz_id: "quiz-123",
    host_id: "host-123",
    ...overrides,
  };
};

/**
 * @param {Partial<import("../infra/models/participant.model.js").ParticipantModel>} overrides
 * @returns {import("../infra/models/participant.model.js").ParticipantModel}
 */
export const createParticipantModel = (overrides = {}) => {
  return {
    id: "part-123",
    role: ParticipantRoles.PLAYER,
    session_id: "session-123",
    nickname: "Nickname",
    socket_id: "socket-123",
    ...overrides,
  };
};

/**
 * @param {Partial<import("../core/entities/session.entity.js").SessionEntity>} overrides
 * @returns {import("../core/entities/session.entity.js").SessionEntity}
 */
export const createSessionEntity = (overrides = {}) => {
  return new SessionEntity({
    id: "session-123",
    publicKey: "pub-key-123",
    status: SessionStatus.CREATED,
    currentQuestionId: null,
    quizzId: "quiz-123",
    hostId: "host-123",
    ...overrides,
  });
};

/**
 * @param {Partial<import("../core/entities/participant.entity.js").ParticipantEntity>} overrides
 * @returns {import("../core/entities/participant.entity.js").ParticipantEntity}
 */
export const createParticipantEntity = (overrides = {}) => {
  return new ParticipantEntity({
    id: "part-123",
    role: ParticipantRoles.PLAYER,
    sessionId: "session-123",
    nickname: "Nickname",
    socketId: "socket-123",
    ...overrides,
  });
};
