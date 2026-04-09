import { BaseService } from "common-core";
import { CryptoService } from "common-crypto";
import { SessionEntity } from "../core/entities/session.entity.js";
import { CreateSessionResponseDto } from "../contracts/session.dto.js";
import {
  EMPTY_QUIZZ,
  QUIZZ_NOT_FOUND,
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles, SessionStatus } from "common-contracts";
import logger from "../../../logger.js";
import { SessionMapper } from "../infra/mappers/session.mapper.js";
import { ParticipantMapper } from "../infra/mappers/participant.mapper.js";
import { call } from "common-axios";
import { config } from "../../../config.js";
import { TokenService, TokenType, UserRole } from "common-auth";
import { BaseError, UnauthorizedError } from "common-errors";

export class SessionService extends BaseService {
  /** @type {import('../core/ports/session.repository.js').ISessionRepository} */
  sessionRepository;
  /** @type {import('common-kafka').KafkaProducer | null} */
  kafkaProducer;
  /** @type {import('../core/ports/participant.repository.js').IParticipantRepository} */
  participantRepository;
  /** @type {import("common-valkey").ValkeyRepository} */
  valkeyRepository;

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
    try {
      const internalTokenHeader = headers["internal-token"];
      const internalToken = Array.isArray(internalTokenHeader)
        ? internalTokenHeader[0]
        : internalTokenHeader;

      const quiz = await call({
        url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
        method: "POST",
        data: { quizId: data.quiz_id },
        headers: {
          "internal-token": internalToken || "",
        },
      }).catch((err) => {
        if (err.statusCode === 404) {
          throw QUIZZ_NOT_FOUND(data.quiz_id);
        }
        throw err;
      });

      if (!quiz) {
        throw QUIZZ_NOT_FOUND(data.quiz_id);
      }

      const questions = quiz.questions;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        logger.warn(`Quiz with id ${data.quiz_id} has no questions`);
        throw EMPTY_QUIZZ(data.quiz_id);
      }

      const payload =
        /** @type {import('common-auth').InternalTokenPayload} */ (
          CryptoService.verify(
            internalToken || "",
            config.auth.internal.publicKeyPath,
          )
        );
      const hostId = payload.userId;
      if (!hostId) {
        throw new UnauthorizedError("Invalid token: userId not found");
      }

      const sessionEntity = new SessionEntity({
        id: null,
        publicKey: null,
        status: SessionStatus.LOBBY,
        currentQuestionId: null,
        hostId: hostId,
        quizzId: data.quiz_id,
      });
      const session = await this.sessionRepository.create(sessionEntity);

      await this.valkeyRepository.set(
        `session:${session.id}:questions`,
        questions,
      );

      const hostEntity = new ParticipantEntity({
        id: null,
        role: ParticipantRoles.HOST,
        sessionId: session.id,
        nickname: "Host",
        socketId: "",
      });
      const host = await this.participantRepository.create(hostEntity);

      const gameToken = TokenService.signGameToken(
        {
          sessionId: session.id,
          participantId: host.id,
          role: UserRole.MODERATOR,
          type: TokenType.GAME,
        },
        config.auth.game.privateKeyPath,
      );

      return new CreateSessionResponseDto({
        session_id: session.id,
        public_key: session.publicKey,
        game_token: gameToken,
      });
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in createSession for quiz ${data.quiz_id}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../contracts/session.dto.js').GetSessionResponseDto>}
   */
  async getSession(sessionId) {
    try {
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
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in getSession for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async startSession(sessionId, headers) {
    try {
      const internalTokenHeader = headers["internal-token"];
      const internalToken = Array.isArray(internalTokenHeader)
        ? internalTokenHeader[0]
        : internalTokenHeader;

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
        url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
        method: "POST",
        data: { quizId: session.quizzId },
        headers: {
          "internal-token": internalToken || "",
        },
      }).catch((err) => {
        logger.warn(
          `Failed to fetch full quiz for quiz with id ${session.quizzId}: `,
          err,
        );
        throw QUIZZ_NOT_FOUND(session.quizzId);
      });

      const questions = quiz.questions;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        logger.warn(`Quiz with id ${session.quizzId} has no questions`);
        throw EMPTY_QUIZZ(session.quizzId);
      }

      const questionId = questions[0].id;

      await this.valkeyRepository.set(
        `session:${session.id}:questions`,
        questions,
      );

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
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in startSession for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async nextQuestion(sessionId, headers) {
    try {
      const internalTokenHeader = headers["internal-token"];
      const internalToken = Array.isArray(internalTokenHeader)
        ? internalTokenHeader[0]
        : internalTokenHeader;

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
        questions = cachedQuestions;
      } else {
        const quizResponse = await call({
          url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
          method: "POST",
          data: { quizId: session.quizzId },
          headers: {
            "internal-token": internalToken || "",
          },
        }).catch((err) => {
          logger.warn(
            `Failed to fetch questions for quiz with name ${session.quizzId}: `,
            err,
          );
          throw QUIZZ_NOT_FOUND(session.quizzId);
        });
        questions = quizResponse.questions;
        await this.valkeyRepository.set(
          `session:${session.id}:questions`,
          questions,
        );
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

      if (!questions[currentIndex + 1] || !questions[currentIndex + 1].id) {
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
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in nextQuestion for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async endSession(sessionId) {
    try {
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
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in endSession for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    try {
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
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in deleteSession for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<any | null>}
   */
  async getCurrentQuestion(sessionId, headers) {
    try {
      const internalTokenHeader = headers["internal-token"];
      const internalToken = Array.isArray(internalTokenHeader)
        ? internalTokenHeader[0]
        : internalTokenHeader;

      const session = await this.sessionRepository.find(sessionId);
      if (!session) {
        throw SESSION_NOT_FOUND();
      }

      if (!session.currentQuestionId) {
        return null;
      }

      const cachedQuestions = await this.valkeyRepository.get(
        `session:${session.id}:questions`,
      );

      if (cachedQuestions && Array.isArray(cachedQuestions)) {
        const questions = cachedQuestions;
        const question = questions.find(
          /** @param {any} q */ (q) => q.id === session.currentQuestionId,
        );

        if (question) {
          return {
            ...question,
            choices: (question.choices || []).map(
              (/** @type {{ [x: string]: any; is_correct: boolean; }} */ c) => {
                const { is_correct, ...rest } = c;
                return rest;
              },
            ),
          };
        }
      }

      const questions = await call({
        url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
        method: "POST",
        data: { quizId: session.quizzId },
        headers: {
          "internal-token": internalToken || "",
        },
      })
        .then((res) => res.questions)
        .catch((err) => {
          logger.warn(
            `Failed to fetch full quiz for session ${session.id}: `,
            err,
          );
          return null;
        });

      if (questions && Array.isArray(questions)) {
        await this.valkeyRepository
          .set(`session:${session.id}:questions`, questions)
          .catch((e) =>
            logger.warn(`Failed to hydrate cache for session ${session.id}`, e),
          );

        const question = questions.find(
          (q) => q.id === session.currentQuestionId,
        );
        if (question) {
          return {
            ...question,
            choices: (question.choices || []).map(
              (/** @type {{ [x: string]: any; is_correct: boolean; }} */ c) => {
                const { is_correct, ...rest } = c;
                return rest;
              },
            ),
          };
        }
      }

      return null;
    } catch (error) {
      const err = /** @type {BaseError} */ (error);
      logger.error(
        `Error in getCurrentQuestion for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }
}
