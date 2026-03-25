import { BaseService } from "common-core";
import { SessionEntity } from "../core/entities/session.entity.js";
import {
  CreateSessionResponseDto,
  GetSessionResponseDto,
} from "../contracts/session.dto.js";
import { SessionStatus } from "../core/entities/session-status.js";
import {
  SESSION_NOT_FOUND,
  SESSION_NOT_OPEN,
} from "../errors/session.errors.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles } from "../core/entities/participant-roles.js";

export class SessionService extends BaseService {
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
   * @param {import('../contracts/session.dto.js').CreateSessionRequestDto} data
   * @returns {Promise<import('../contracts/session.dto.js').CreateSessionResponseDto>}
   */
  async createSession(data) {
    // Verifier si l'utilisateur existe
    // Verifier si le quiz existe

    // Creer une session
    const sessionEntity = new SessionEntity({
      id: null,
      publicKey: null,
      status: SessionStatus.CREATED,
      currentQuestionId: "",
      hostId: data.host_id,
      quizzId: data.quiz_id,
    });
    const session = await this.sessionRepository.create(sessionEntity);
    // Ajouter l'utilisateur en tant qu'host de la session
    const hostEntity = new ParticipantEntity({
      id: data.host_id,
      role: ParticipantRoles.ADMIN,
      sessionId: session.id,
      nickname: "Host",
      socketId: "",
    });
    await this.participantRepository.create(hostEntity);

    return new CreateSessionResponseDto({
      session_id: session.id,
      public_key: session.publicKey,
    });
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<GetSessionResponseDto>}
   */
  async getSession(sessionId) {
    // Verifier si la session existe
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    // Recuperer les participants de la session
    const participants =
      await this.participantRepository.findBySessionId(sessionId);
    return new GetSessionResponseDto({
      session_id: session.id,
      public_key: session.publicKey,
      status: session.status,
      current_question_id: session.currentQuestionId,
      quizz_id: session.quizzId,
      host_id: session.hostId,
      participants: participants,
    });
  }

  /**
   * @param {import('../contracts/session.dto.js').StartSessionRequestDto} data
   * @returns {Promise<void>}
   */
  async startSession(data) {
    // Verifier si la session existe
    const session = await this.sessionRepository.find(data.session_id);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    // Verifier si la session est dans un état qui permet de la démarrer
    if (session.status !== SessionStatus.LOBBY) {
      throw SESSION_NOT_OPEN();
    }
    // Recuperer la première question du quiz et la définir comme question active de la session
    const questionId = "TODO";
    // Mettre à jour le statut de la session
    await this.sessionRepository.update(session.id, {
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: questionId,
    });
    // Publier un événement de démarrage de session
    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "session-started",
        JSON.stringify({
          session_id: session.id,
        }),
      );
      await this.kafkaProducer.publish(
        "session-next-question",
        JSON.stringify({
          session_id: session.id,
          question_id: questionId,
        }),
      );
    }
  }

  /**
   * @param {import('../contracts/session.dto.js').NextQuestionRequestDto} data
   * @returns {Promise<void>}
   */
  async nextQuestion(data) {
    // Verifier si la session existe
    const session = await this.sessionRepository.find(data.session_id);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    // Verifier si la session est dans un état qui permet de passer à la question suivante
    if (
      session.status !== SessionStatus.QUESTION_ACTIVE &&
      session.status !== SessionStatus.QUESTION_CLOSED
    ) {
      throw SESSION_NOT_OPEN();
    }

    // Recuperer la question suivante du quiz et la définir comme question active de la session
    const questionId = "TODO";
    // Mettre à jour le statut de la session
    await this.sessionRepository.update(session.id, {
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: questionId,
    });
    // Publier un événement de changement de question
    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "session-next-question",
        JSON.stringify({
          session_id: session.id,
          question_id: questionId,
        }),
      );
    }
  }

  /**
   * @param {import('../contracts/session.dto.js').EndSessionRequestDto} data
   * @returns {Promise<void>}
   */
  async endSession(data) {
    // Verifier si la session existe
    const session = await this.sessionRepository.find(data.session_id);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    // Supprimer la session
    await this.sessionRepository.delete(session.id);
    // Publier un événement de fin de session
    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "session-ended",
        JSON.stringify({
          session_id: session.id,
        }),
      );
    }
  }
}
