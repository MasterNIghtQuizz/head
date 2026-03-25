import { BaseService } from "@common/core/index.js";
import { JoinSessionResponseDto } from "../contracts/session.dto.js";
import { SessionStatus } from "../core/entities/session-status.js";
import { SESSION_NOT_OPEN } from "../errors/session.errors.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles } from "../core/entities/participant-roles.js";

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
   * @returns {Promise<JoinSessionResponseDto>}
   */
  async joinSession(data) {
    // Verifier si la session existe
    const session = await this.sessionRepository.findByPublicKey(
      data.session_public_key,
    );
    // Verifier si la session est ouverte
    if (!session || session.status !== SessionStatus.LOBBY) {
      throw SESSION_NOT_OPEN();
    }
    // Creer un participant et l'ajouter à la session
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
}
