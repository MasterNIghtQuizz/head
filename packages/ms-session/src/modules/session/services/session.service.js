import { BaseService, Question, Choice } from "common-core";
import { CryptoService } from "common-crypto";
import { SessionEntity } from "../core/entities/session.entity.js";
import {
  CreateSessionResponseDto,
  GetCurrentQuestionResponseDto,
} from "../contracts/session.dto.js";
import {
  EMPTY_QUIZZ,
  QUIZZ_NOT_FOUND,
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
  QUESTION_NOT_FOUND,
} from "../errors/session.errors.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import { ParticipantRoles, SessionStatus } from "common-contracts";
import { SessionEventTypes } from "common-contracts/src/events.js";
import logger from "../../../logger.js";
import { SessionMapper } from "../infra/mappers/session.mapper.js";
import { ParticipantMapper } from "../infra/mappers/participant.mapper.js";
import { call } from "common-axios";
import { config } from "../../../config.js";
import { TokenService, TokenType, UserRole } from "common-auth";
import { UnauthorizedError } from "common-errors";
import { Topics } from "common-contracts";
import { randomUUID } from "node:crypto";

export class SessionService extends BaseService {
  /** @type {import('../core/ports/session.repository.js').ISessionRepository} */
  sessionRepository;
  /** @type {import('common-kafka').KafkaProducer | null} */
  kafkaProducer;
  /** @type {import('../core/ports/participant.repository.js').IParticipantRepository} */
  participantRepository;
  /** @type {import("common-valkey").ValkeyRepository} */
  valkeyRepository;
  /** @type {import('../infra/repositories/buzzer.repository.js').BuzzerRepository} */
  buzzerRepository;

  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/session.repository.js').ISessionRepository} sessionRepository
   * @param {import('../core/ports/participant.repository.js').IParticipantRepository} participantRepository
   * @param {import("common-valkey").ValkeyRepository} valkeyRepository
   * @param {import('../infra/repositories/buzzer.repository.js').BuzzerRepository} buzzerRepository
   */
  constructor(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    buzzerRepository,
  ) {
    super();
    this.sessionRepository = sessionRepository;
    this.kafkaProducer = kafkaProducer;
    this.participantRepository = participantRepository;
    this.valkeyRepository = valkeyRepository;
    this.buzzerRepository = buzzerRepository;
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

      const quiz = await this._getQuizWithFallback(
        data.quiz_id,
        internalToken || "",
      );

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
      logger.info(
        { sessionId: session.id, quizId: data.quiz_id, hostId },
        "New session created successfully",
      );

      try {
        const questionIds = questions.map((/** @type {Question} */ q) => q.id);
        await this.valkeyRepository.set(
          `session:${session.id}:questions:ids`,
          questionIds,
          3600,
        );

        await Promise.all(
          questions.map(async (/** @type {Question} */ q) => {
            const validationData = {
              id: q.id,
              type: q.type,
              timer_seconds: q.timer_seconds,
              choiceIds: (q.choices || []).map(
                (/** @type {Choice} */ c) => c.id,
              ),
            };
            const fullQuestion = new Question({
              ...q,
              choices: (q.choices || []).map(
                // eslint-disable-next-line no-unused-vars
                ({ is_correct, ...rest }) => new Choice(rest),
              ),
            });

            await Promise.all([
              this.valkeyRepository.set(
                `question:${q.id}:validation`,
                validationData,
                3600,
              ),
              this.valkeyRepository.set(
                `question:${q.id}:full`,
                fullQuestion,
                3600,
              ),
            ]);
          }),
        );
      } catch (err) {
        logger.error({ err }, "Failed to pre-cache questions in Valkey");
      }

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

      if (this.kafkaProducer) {
        if (!session.id || !session.quizzId || !host.id) {
          throw new Error("Invalid session data");
        }
        /** @type {import('common-contracts').SessionCreatedEventPayload} */
        const payload = {
          session_id: session.id,
          quiz_id: session.quizzId,
          participant_id: host.id,
          nickname: host.nickname,
          role: host.role,
        };
        logger.info(
          { payload },
          "DEBUG [ms-session] Publishing SESSION_CREATED event to Kafka",
        );
        await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
          eventId: randomUUID(),
          timestamp: Date.now(),
          eventType: SessionEventTypes.SESSION_CREATED,
          payload,
        });
        logger.info(
          { sessionId: session.id, hostId },
          "DEBUG [ms-session] SESSION_CREATED event published successfully",
        );
      }

      return new CreateSessionResponseDto({
        session_id: session.id,
        public_key: session.publicKey,
        game_token: gameToken,
      });
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
      logger.error(
        `Error in createSession for quiz ${data.quiz_id}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @param {string} participantId
   * @param {import("http").IncomingHttpHeaders} [headers={}]
   * @returns {Promise<import('../contracts/session.dto.js').GetSessionResponseDto>}
   */
  async getSession(sessionId, participantId, headers = {}) {
    try {
      const session = await this.sessionRepository.find(sessionId);
      if (!session) {
        logger.warn(`Session with id ${sessionId} not found`);
        throw SESSION_NOT_FOUND(sessionId);
      }

      const [participants, currentQuestion, activatedAt] = await Promise.all([
        this.participantRepository.findBySessionId(sessionId),
        session.currentQuestionId
          ? this.getCurrentQuestion(sessionId, headers, participantId).catch(
            (err) => {
              logger.warn(
                { sessionId, err: err.message },
                "Failed to fetch current question during getSession",
              );
              return null;
            },
          )
          : Promise.resolve(null),
        this.valkeyRepository.get(`session:${sessionId}:question_activated_at`),
      ]);

      const hasAnswered =
        session.currentQuestionId && participantId
          ? await this.valkeyRepository.get(
            `session:${sessionId}:question:${session.currentQuestionId}:participant:${participantId}:answered`,
          )
          : false;

      const dto = SessionMapper.toDto(
        session,
        participants.map((p) => ParticipantMapper.toDto(p)),
        currentQuestion,
        activatedAt ? Number(activatedAt) : null,
        !!hasAnswered,
      );

      return dto;
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
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
        throw SESSION_NOT_FOUND(sessionId);
      }

      const quiz = await this._getQuizWithFallback(
        session.quizzId,
        internalToken || "",
      );
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw QUIZZ_NOT_FOUND(session.quizzId);
      }

      const firstQuestion = quiz.questions[0];
      const questionId = firstQuestion.id;

      await Promise.all([
        this.sessionRepository.update(session.id, {
          status: SessionStatus.QUESTION_ACTIVE,
          currentQuestionId: questionId,
        }),
        this.buzzerRepository.clear(session.id),
      ]);

      await this.valkeyRepository.set(
        `session:${sessionId}:question_activated_at`,
        Date.now(),
        3600,
      );

      if (this.kafkaProducer) {
        /** @type {import('common-contracts').SessionStartedEventPayload} */
        const payload = {
          session_id: sessionId,
        };
        await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
          eventId: randomUUID(),
          timestamp: Date.now(),
          eventType: SessionEventTypes.SESSION_STARTED,
          payload,
        });
      }
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
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

      const quiz = await this._getQuizWithFallback(
        session.quizzId,
        internalToken || "",
      );
      if (!quiz || !quiz.questions) {
        throw QUIZZ_NOT_FOUND(session.quizzId);
      }

      const currentIndex = quiz.questions.findIndex(
        (q) => q.id === session.currentQuestionId,
      );

      if (currentIndex === -1 || currentIndex === quiz.questions.length - 1) {
        await this.sessionRepository.update(session.id, {
          status: SessionStatus.FINISHED,
          currentQuestionId: null,
        });

        if (this.kafkaProducer) {
          /** @type {import('common-contracts').SessionEndedEventPayload} */
          const payload = {
            session_id: sessionId,
          };
          await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
            eventId: randomUUID(),
            timestamp: Date.now(),
            eventType: SessionEventTypes.SESSION_ENDED,
            payload,
          });
        }
      } else {
        const nextQuestion = quiz.questions[currentIndex + 1];
        const questionId = nextQuestion.id;

        await Promise.all([
          this.sessionRepository.update(session.id, {
            currentQuestionId: questionId,
          }),
          this.buzzerRepository.clear(session.id),
        ]);

        await this.valkeyRepository.set(
          `session:${sessionId}:question_activated_at`,
          Date.now(),
          3600,
        );

        if (this.kafkaProducer) {
          /** @type {import('common-contracts').SessionNextQuestionEventPayload} */
          const payload = {
            session_id: sessionId,
            question_id: questionId,
          };
          await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
            eventId: randomUUID(),
            timestamp: Date.now(),
            eventType: SessionEventTypes.SESSION_NEXT_QUESTION,
            payload,
          });
        }
      }
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
      logger.error(
        `Error in nextQuestion for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @param {string} [participantId]
   * @returns {Promise<import('../contracts/session.dto.js').GetCurrentQuestionResponseDto | null>}
   */
  async getCurrentQuestion(sessionId, headers, participantId = "") {
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

      const cachedFullQuestion = await this.valkeyRepository.get(
        `question:${session.currentQuestionId}:full`,
      );

      /** @type {Question | null} */
      let question = null;

      if (cachedFullQuestion) {
        logger.debug(
          { sessionId, questionId: session.currentQuestionId },
          "Current question retrieved from cache",
        );
        question = new Question(cachedFullQuestion);
      } else {
        logger.info(
          { sessionId, questionId: session.currentQuestionId },
          "Cache miss for current question, fetching from management service",
        );

        if (!session.quizzId) {
          throw new Error(`Session ${sessionId} has no associated quiz ID`);
        }

        const quizData = await this._getQuizWithFallback(
          session.quizzId,
          internalToken || "",
        ).catch((err) => {
          logger.warn(
            `Failed to fetch full quiz for session ${session.id} after fallback: `,
            err,
          );
          return null;
        });

        if (quizData && quizData.questions) {
          const questions = quizData.questions;
          const questionIds = questions.map((/** @type {any} */ q) => q.id);
          await this.valkeyRepository.set(
            `session:${session.id}:questions:ids`,
            questionIds,
            3600,
          );

          await Promise.all(
            questions.map(async (/** @type {any} */ q) => {
              const validationData = {
                id: q.id,
                type: q.type,
                timer_seconds: q.timer_seconds,
                choiceIds: (q.choices || []).map(
                  (/** @type {any} */ c) => c.id,
                ),
              };
              const fullQuestion = new Question({
                ...q,
                choices: (q.choices || []).map(
                  // eslint-disable-next-line no-unused-vars
                  ({ is_correct, ...rest }) => new Choice(rest),
                ),
              });

              await Promise.all([
                this.valkeyRepository.set(
                  `question:${q.id}:validation`,
                  validationData,
                  3600,
                ),
                this.valkeyRepository.set(
                  `question:${q.id}:full`,
                  fullQuestion,
                  3600,
                ),
              ]);
            }),
          );

          question = questions.find((q) => q.id === session.currentQuestionId);
        }
      }

      if (!question) {
        throw QUESTION_NOT_FOUND(session.currentQuestionId);
      }

      const isModerator = participantId
        ? session.hostId === participantId
        : false;
      let currentBuzzer = null;

      if (question.type === "buzzer") {
        try {
          const buzzerData = await this.buzzerRepository.peek(sessionId);

          if (buzzerData) {
            currentBuzzer = {
              id: buzzerData.participantId,
              username: buzzerData.username,
              pressed_at: Number(buzzerData.pressedAt),
            };
            logger.debug(
              { sessionId, currentBuzzer },
              "Current buzzer data retrieved successfully",
            );
          }
        } catch {
          logger.warn(
            { sessionId },
            "Valkey down during getCurrentQuestion, pinging host/WS for recovery",
          );
          if (this.kafkaProducer) {
            await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
              eventId: randomUUID(),
              timestamp: Date.now(),
              eventType: SessionEventTypes.PING_HOST_FOR_QUEUE,
              payload: { sessionId },
            });
          }
        }
      }

      return new GetCurrentQuestionResponseDto({
        question_id: question.id,
        id: question.id,
        label: question.label,
        type: question.type,
        timer_seconds: question.timer_seconds,
        choices: (question.choices || []).map((c) => ({
          id: c.id,
          text: c.text,
          ...(isModerator ? { is_correct: c.is_correct } : {}),
        })),
        current_buzzer: currentBuzzer,
      });
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
      logger.error(
        `Error in getCurrentQuestion for session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * @private
   * @param {string} quizId
   * @param {string} internalToken
   * @returns {Promise<any>}
   */
  async _getQuizWithFallback(quizId, internalToken) {
    const cacheKey = `quiz-cache:${quizId}`;

    try {
      const quiz = await call({
        url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
        method: "POST",
        data: { quizId },
        headers: {
          "internal-token": internalToken || "",
        },
      });

      if (quiz) {
        try {
          await this.valkeyRepository.set(cacheKey, quiz, 3600);
        } catch (err) {
          logger.warn({ err }, "Failed to update quiz fallback cache");
        }
        return quiz;
      }
    } catch (err) {
      const error = /** @type {import('common-errors').BaseError} */ (err);
      if (error.statusCode === 404) {
        throw QUIZZ_NOT_FOUND(quizId);
      }

      logger.warn(
        { quizId, err: error.message },
        "ms-quizz unreachable, trying fallback cache",
      );
      const cachedQuiz = await this.valkeyRepository.get(cacheKey);

      if (cachedQuiz) {
        logger.info({ quizId }, "Using cached quiz data (Degraded Mode)");
        return cachedQuiz;
      }

      throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async showResults(sessionId) {
    try {
      const session = await this.sessionRepository.find(sessionId);
      if (!session) {
        throw SESSION_NOT_FOUND(sessionId);
      }

      const channel = "ws:session:results";
      const message = JSON.stringify({
        eventType: "SESSION_RESULTS_DISPLAYED",
        payload: {
          sessionId,
          questionId: session.currentQuestionId,
        },
      });

      await this.valkeyRepository.publish(channel, message);

      logger.info(
        { sessionId, questionId: session.currentQuestionId },
        "Results display triggered via Valkey",
      );
    } catch (error) {
      const err = /** @type {import('common-errors').BaseError} */ (error);
      logger.error({ sessionId, err: err.message }, "Error in showResults");
      throw err;
    }
  }
}
