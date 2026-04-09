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
import { FullQuizResponseDto } from "../contracts/quiz.dto.js";
import jwt from "jsonwebtoken";
import fs from "node:fs";

/**
 * @param {string} token
 * @returns {string} userId
 */
export function extractUserIdFromToken(token) {
  const publicKey = fs.readFileSync(config.auth.internal.publicKeyPath, "utf8");
  const decoded = jwt.verify(token.replace("Bearer ", "").trim(), publicKey, {
    algorithms: ["RS256"],
  });

  if (!decoded || !decoded.userId) {
    throw new Error("Invalid token: userId not found");
  }

  return decoded.userId;
}

export class SessionService extends BaseService {
  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/session.repository.js').ISessionRepository} sessionRepository
   * @param {import('../core/ports/participant.repository.js').IParticipantRepository} participantRepository
   * @param {import("common-valkey").ValkeyRepository} valkeyRepository
   */
  constructor(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
  ) {
    super();
    this.sessionRepository = sessionRepository;
    this.kafkaProducer = kafkaProducer;
    this.participantRepository = participantRepository;
    this.valkeyRepository = valkeyRepository;
  }

  /**
   * @param {import('../contracts/session.dto.js').CreateSessionRequestDto} data
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<import('../contracts/session.dto.js').CreateSessionResponseDto>}
   */
  async createSession(data, headers) {
    logger.info(
      `calling url ${config.services.quizzManagement.baseUrl}/quizzes/get-full with quiz_id ${data.quiz_id}`,
    );
    const quiz = await call({
      url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
      method: "POST",
      data: { quizId: data.quiz_id },
      headers: {
        "internal-token": headers["internal-token"] || "",
      },
    }).catch((err) => {
      logger.warn(`Quiz with id ${data.quiz_id} not found: `, err);
      throw QUIZZ_NOT_FOUND(data.quiz_id);
    });

    logger.info(
      `Received quiz data for quiz_id ${data.quiz_id}: ${JSON.stringify(quiz)}`,
    );

    if (!quiz) {
      logger.warn(`Quiz with id ${data.quiz_id} not found`);
      throw QUIZZ_NOT_FOUND(data.quiz_id);
    }

    const questions = quiz.questions;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn(`Quiz with id ${data.quiz_id} has no questions`);
      throw EMPTY_QUIZZ(data.quiz_id);
    }

    const hostId = extractUserIdFromToken(headers["internal-token"] || "");

    const sessionEntity = new SessionEntity({
      id: null,
      publicKey: null,
      status: SessionStatus.CREATED,
      currentQuestionId: null,
      hostId: hostId,
      quizzId: data.quiz_id,
    });
    const session = await this.sessionRepository.create(sessionEntity);

    await this.valkeyRepository.set(
      `session:${session.id}:questions`,
      JSON.stringify(questions),
    );

    const hostEntity = new ParticipantEntity({
      id: null,
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

    const quiz = await call({
      url: `${config.services.quizzManagement}/questions/quiz/${session.quizzId}`,
      method: "GET",
    }).catch((err) => {
      logger.warn(
        `Failed to fetch questions for quiz with id ${session.quizzId}: `,
        err,
      );
      throw QUIZZ_NOT_FOUND(session.quizzId);
    });
    const questions = /** @type {FullQuizResponseDto} */ (quiz).questions;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn(`Quiz with id ${session.quizzId} has no questions`);
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

    const cachedQuestions = await this.valkeyRepository.get(
      `session:${session.id}:questions`,
    );
    let questions;

    if (cachedQuestions) {
      questions = JSON.parse(cachedQuestions);
    } else {
      questions = await call({
        url: `${config.services.quizzManagement}/quizzes/get-full`,
        method: "GET",
        data: { quiz_id: session.quizzId },
      }).catch((err) => {
        logger.warn(
          `Failed to fetch questions for quiz with id ${session.quizzId}: `,
          err,
        );
        throw QUIZZ_NOT_FOUND(session.quizzId);
      });
    }
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

    if (!(questions[currentIndex + 1] instanceof FullQuizResponseDto)) {
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

    await this.valkeyRepository.del(`session:${session.id}:questions`);

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
