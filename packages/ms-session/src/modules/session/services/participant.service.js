import { BaseService } from "common-core";
import { JoinSessionResponseDto } from "../contracts/session.dto.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import {
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";
import { ParticipantRoles } from "../core/entities/participant-roles.js";
import { SessionStatus } from "../core/entities/session-status.js";

export class ParticipantService extends BaseService {
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

    const participantEntity = new ParticipantEntity({
      id: data.participant_id,
      role: ParticipantRoles.PLAYER,
      sessionId: session.id,
      nickname: data.participant_nickname,
      socketId: "",
    });
    const participant =
      await this.participantRepository.create(participantEntity);
    return new JoinSessionResponseDto({ participant_id: participant.id });
  }

  /**
   * @param {import('../contracts/session.dto.js').LeaveSessionRequestDto} data
   * @returns {Promise<void>}
   */
  async leaveSession(data) {
    const participant = await this.participantRepository.find(
      data.participant_id,
    );
    if (!participant) {
      return;
    }
    await this.participantRepository.delete(participant.id);
  }
}
