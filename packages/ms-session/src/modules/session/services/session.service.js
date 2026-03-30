import { BaseService } from "common-core";
import { SessionEntity } from "../core/entities/session.entity.js";
import {
  CreateSessionResponseDto,
  GetSessionResponseDto,
} from "../contracts/session.dto.js";
import {
  EMPTY_QUIZZ,
  QUIZZ_NOT_FOUND,
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles } from "../core/entities/participant-roles.js";
import { SessionStatus } from "../core/entities/session-status.js";
import logger from "../../../logger.js";
import { SessionMapper } from "../infra/mappers/session.mapper.js";
import { ParticipantMapper } from "../infra/mappers/participant.mapper.js";
import { log } from "node:console";
import { call } from "common-axios";
import { config } from "../../../config.js";
import { QuizResponseDto } from "../contracts/quiz.dto.js";

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
    const quiz = await call({
      url: `${config.services.quizzManagement}/quizzes/${data.quiz_id}`,
      method: "GET",
    }).catch((err) => {
      logger.warn(`Quiz with id ${data.quiz_id} not found: `, err);
      throw QUIZZ_NOT_FOUND(data.quiz_id);
    });

    if (!quiz || !(quiz instanceof QuizResponseDto)) {
      logger.warn(`Quiz with id ${data.quiz_id} not found`);
      throw QUIZZ_NOT_FOUND(data.quiz_id);
    }

    const sessionEntity = new SessionEntity({
      id: null,
      publicKey: null,
      status: SessionStatus.CREATED,
      currentQuestionId: null,
      hostId: data.host_id,
      quizzId: data.quiz_id,
    });
    const session = await this.sessionRepository.create(sessionEntity);

    const hostEntity = new ParticipantEntity({
      id: data.host_id,
      role: ParticipantRoles.HOST,
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
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      logger.warn(`Session with id ${sessionId} not found`);
      throw SESSION_NOT_FOUND();
    }

    const participants =
      await this.participantRepository.findBySessionId(sessionId);
    return SessionMapper.toDto(
      session,
      participants.map((p) => ParticipantMapper.toDto(p)),
    );
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async startSession(sessionId) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      logger.warn(`Session with id ${sessionId} not found`);
      throw SESSION_NOT_FOUND();
    }

    if (session.status !== SessionStatus.LOBBY) {
      logger.warn(
        `Session with id ${sessionId} is in invalid status ${session.status} for starting`,
      );
      throw SESSION_INVALID_STATUS(sessionId);
    }

    const questions = await call({
      url: `${config.services.quizzManagement}/questions/quiz/${session.quizzId}`,
      method: "GET",
    }).catch((err) => {
      logger.warn(
        `Failed to fetch questions for quiz with id ${session.quizzId}: `,
        err,
      );
      throw QUIZZ_NOT_FOUND(session.quizzId);
    });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn(`Quiz with id ${session.quizzId} has no questions`);
      throw EMPTY_QUIZZ(session.quizzId);
    }

    if (!(questions[0] instanceof QuizResponseDto)) {
      logger.warn(
        `Quiz with id ${session.quizzId} has invalid questions format`,
      );
      throw EMPTY_QUIZZ(session.quizzId);
    }

    const questionId = questions[0].id;
    await this.sessionRepository.update(session.id, {
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: questionId,
    });

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
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async nextQuestion(sessionId) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND(sessionId);
    }
    if (
      session.status !== SessionStatus.QUESTION_ACTIVE &&
      session.status !== SessionStatus.QUESTION_CLOSED
    ) {
      throw SESSION_INVALID_STATUS(sessionId);
    }

    const questions = await call({
      url: `${config.services.quizzManagement}/questions/quiz/${session.quizzId}`,
      method: "GET",
    }).catch((err) => {
      logger.warn(
        `Failed to fetch questions for quiz with id ${session.quizzId}: `,
        err,
      );
      throw QUIZZ_NOT_FOUND(session.quizzId);
    });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn(`Quiz with id ${session.quizzId} has no questions`);
      throw EMPTY_QUIZZ(session.quizzId);
    }

    const currentIndex = questions.findIndex(
      (q) => q.id === session.currentQuestionId,
    );
    if (currentIndex === -1) {
      logger.warn(
        `Current question with id ${session.currentQuestionId} not found in quiz ${session.quizzId}`,
      );
      throw QUIZZ_NOT_FOUND(session.quizzId);
    }
    if (currentIndex === questions.length - 1) {
      logger.warn(
        `No more questions available for quiz with id ${session.quizzId}`,
      );
      this.endSession(sessionId);
      return;
    }

    if (!(questions[currentIndex + 1] instanceof QuizResponseDto)) {
      logger.warn(
        `Quiz with id ${session.quizzId} has invalid questions format`,
      );
      throw EMPTY_QUIZZ(session.quizzId);
    }

    const questionId = questions[currentIndex + 1].id;

    await this.sessionRepository.update(session.id, {
      status: SessionStatus.QUESTION_ACTIVE,
      currentQuestionId: questionId,
    });
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
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async endSession(sessionId) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }
    await this.sessionRepository.update(session.id, {
      status: SessionStatus.FINISHED,
    });

    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "session-ended",
        JSON.stringify({
          session_id: session.id,
        }),
      );
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND();
    }

    await this.sessionRepository.delete(sessionId);

    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "session-deleted",
        JSON.stringify({
          session_id: sessionId,
        }),
      );
    }
  }
}
