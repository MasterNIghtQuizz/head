import { BaseService } from "common-core";
import { JoinSessionResponseDto } from "../contracts/session.dto.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import {
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";
import { ParticipantRoles, SessionStatus } from "common-contracts";
import { TokenService, TokenType, UserRole } from "common-auth";
import { config } from "../../../config.js";
import { randomUUID } from "node:crypto";

export class ParticipantService extends BaseService {
  /** @type {import('../core/ports/session.repository.js').ISessionRepository} */
  sessionRepository;
  /** @type {import('common-kafka').KafkaProducer | null} */
  kafkaProducer;
  /** @type {import('../core/ports/participant.repository.js').IParticipantRepository} */
  participantRepository;

  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/session.repository.js').ISessionRepository} sessionRepository
   * @param {import('../core/ports/participant.repository.js').IParticipantRepository} participantRepository
   */
  constructor(kafkaProducer, sessionRepository, participantRepository) {
    super();
    this.sessionRepository = sessionRepository;
    this.kafkaProducer = kafkaProducer;
    this.participantRepository = participantRepository;
  }

  /**
   * @param {import('../contracts/session.dto.js').JoinSessionRequestDto} data
   * @returns {Promise<import('../contracts/session.dto.js').JoinSessionResponseDto>}
   */
  async joinSession(data) {
    const session = await this.sessionRepository.findByPublicKey(
      data.session_public_key,
    );

    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    if (session.status !== SessionStatus.LOBBY) {
      throw SESSION_INVALID_STATUS(session.id);
    }
    const participantId = randomUUID();

    const participantEntity = new ParticipantEntity({
      id: participantId,
      role: ParticipantRoles.PLAYER,
      sessionId: session.id,
      nickname: data.participant_nickname,
      socketId: "",
    });
    await this.participantRepository.create(participantEntity);

    const gameToken = TokenService.signGameToken(
      {
        sessionId: session.id,
        participantId: participantId,
        role: UserRole.USER,
        type: TokenType.GAME,
      },
      config.auth.game.privateKeyPath,
    );

    return new JoinSessionResponseDto({
      participant_id: participantId,
      game_token: gameToken,
    });
  }

  /**
   * @param {string} participantId
   * @returns {Promise<void>}
   */
  async leaveSession(participantId) {
    const participant = await this.participantRepository.find(participantId);
    if (!participant) {
      return;
    }
    await this.participantRepository.delete(participant.id);
  }
}
