import { BaseService } from "common-core";
import { TokenType } from "common-auth";
import { CryptoService } from "common-crypto";
import { config } from "../../../config.js";
import logger from "../../../logger.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { ResponseError } from "../response.constants.js";
import { ResponseEntity } from "../core/entities/response.entity.js";

export class ResponseService extends BaseService {
  /** @type {import('../core/ports/response.repository.js').ResponseRepository} */
  responseRepository;

  /** @type {import('common-valkey').ValkeyRepository} */
  valkeyRepository;

  /** @type {import('../../../infrastructure/clients/quiz.client.js').QuizClient} */
  quizClient;

  /** @type {import('../../../infrastructure/clients/session.client.js').SessionClient} */
  sessionClient;

  /**
   * @param {import('../core/ports/response.repository.js').ResponseRepository} responseRepository
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   * @param {import('../../../infrastructure/clients/quiz.client.js').QuizClient} quizClient
   * @param {import('../../../infrastructure/clients/session.client.js').SessionClient} sessionClient
   */
  constructor(responseRepository, valkeyRepository, quizClient, sessionClient) {
    super();
    this.responseRepository = responseRepository;
    this.valkeyRepository = valkeyRepository;
    this.quizClient = quizClient;
    this.sessionClient = sessionClient;
  }

  /**
   * @param {import('common-contracts').AnswerEvent} event
   * @returns {Promise<import('../core/entities/response.entity.js').ResponseEntity>}
   */
  async handleAnswer(event) {
    const isBuzzer = event.isCorrect !== undefined;

    logger.debug(
      {
        participantId: event.participantId,
        sessionId: event.sessionId,
        isBuzzer,
      },
      "Processing answer submission",
    );

    let questionId = await this.valkeyRepository.get(
      `currentSessionQuestion:${event.sessionId}`,
    );

    if (!questionId) {
      await this.handleQuizNotFound(event.sessionId, event.participantId);
      questionId = await this.valkeyRepository.get(
        `currentSessionQuestion:${event.sessionId}`,
      );
      if (!questionId) {
        logger.warn(
          { sessionId: event.sessionId },
          "No current question found in cache after recovery attempt",
        );
        throw new Error(ResponseError.QUIZ_NOT_FOUND);
      }
    }

    if (!isBuzzer) {
      const existing =
        await this.responseRepository.findByParticipantAndQuestion(
          event.participantId,
          questionId,
        );
      if (existing) {
        logger.warn(
          { participantId: event.participantId, questionId },
          "Duplicate answer attempt rejected",
        );
        throw new Error(ResponseError.ALREADY_ANSWERED);
      }
    }

    const responseEntity = new ResponseEntity({
      id: "",
      participantId: event.participantId,
      questionId: questionId,
      sessionId: event.sessionId,
      choiceId: event.choiceId ?? null,
      isCorrect: isBuzzer ? (event.isCorrect ?? null) : null,
      submittedAt: new Date(),
    });

    if (responseEntity.isCorrect === null) {
      try {
        const isCorrect = await this.getIsCorrectFromCache(
          responseEntity.sessionId,
          responseEntity.questionId,
          responseEntity.choiceId,
          responseEntity.participantId,
        );
        responseEntity.update({ isCorrect });
      } catch {
        logger.error(
          { sessionId: event.sessionId, questionId, choiceId: event.choiceId },
          "Failed to resolve answer correctness from cache",
        );
        throw new Error(ResponseError.QUIZ_SERVICE_ERROR);
      }
    }

    try {
      const saved = await this.responseRepository.create(responseEntity);
      logger.info(
        {
          responseId: saved.id,
          participantId: saved.participantId,
          sessionId: saved.sessionId,
          isCorrect: saved.isCorrect,
        },
        "Answer recorded successfully",
      );
      return saved;
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} hostId
   * @returns {string}
   */
  getToken(hostId) {
    const payload = {
      userId: hostId,
      type: TokenType.INTERNAL,
      source: "api-gateway",
    };

    return CryptoService.sign(payload, this.getKey(), { expiresIn: "30s" });
  }

  /**
   * @returns {string}
   */
  getKey() {
    return config.auth.internal.privateKeyPath;
  }

  /**
   * @param {string} participantId
   * @param {string} sessionId
   * @returns {Promise<import('../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async getResponsesByParticipant(participantId, sessionId) {
    const results = await this.responseRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
    logger.debug(
      { participantId, sessionId, count: results.length },
      "Fetched participant responses",
    );
    return results;
  }

  /**
   * @param {string} questionId
   * @param {string} sessionId
   * @returns {Promise<import('../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async getResponsesByQuestion(questionId, sessionId) {
    const results = await this.responseRepository.findByQuestionAndSession(
      questionId,
      sessionId,
    );
    logger.debug(
      { questionId, sessionId, count: results.length },
      "Fetched question responses",
    );
    return results;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async getAllSessionResponses(sessionId) {
    const results = await this.responseRepository.findBySession(sessionId);
    logger.debug(
      { sessionId, count: results.length },
      "Fetched all session responses",
    );
    return results;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async clearSession(sessionId) {
    await this.responseRepository.deleteBySessionId(sessionId);
    await this.valkeyRepository.del(`sessionQuizId:${sessionId}`);
    await this.valkeyRepository.del(`currentSessionQuestion:${sessionId}`);
    logger.info({ sessionId }, "Session responses cleared");
  }

  /**
   * @param {string} sessionId
   * @param {string} hostId
   * @param {string} quizId
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<void>}
   */
  async startNewSession(sessionId, hostId, quizId, headers = {}) {
    logger.info("entering startNewSession()");
    await this.valkeyRepository.set(`sessionQuizId:${sessionId}`, quizId, 3600);

    const quiz = await this.fetchQuizz(quizId, hostId, headers);
    const cacheKey = `currentSessionQuestion:${sessionId}`;

    if (!quiz?.questions?.length) {
      logger.warn({ quizId }, "Quiz found but contains no questions");
      throw new Error(ResponseError.QUIZ_NOT_FOUND);
    }

    await this.valkeyRepository.set(cacheKey, quiz.questions[0].id, 3600);

    logger.info(
      { sessionId, quizId, firstQuestionId: quiz.questions[0].id },
      "Session context initialized",
    );
  }

  /**
   * @param {string} quizID
   * @param {string} hostId
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<import('common-contracts').Quizz>}
   */
  async fetchQuizz(quizID, hostId, headers = {}) {
    logger.info("entering fetchQuizz");
    const cached = await this.valkeyRepository.get(`quiz:${quizID}`);
    if (cached && cached.questions) {
      logger.info({ quizID } + "Quiz data served from cache");
      logger.info({ cached });
      return cached;
    }

    logger.info("getting token");
    const internalToken = this.getToken(hostId);

    logger.info("fetching quiz service");
    const quiz = await this.quizClient.getQuiz(quizID, {
      ...headers,
      "internal-token": internalToken,
    });

    if (!quiz) {
      logger.warn({ quizID } + "Quiz not found from management service");
      throw new Error(ResponseError.QUIZ_NOT_FOUND);
    }
    logger.info("storing quiz in Valkey");
    try {
      await this.valkeyRepository.set(`quiz:${quizID}`, quiz, 3600);
      logger.info("quiz data cached in Valkey for 1 hour");
    } catch {
      logger.warn({ quizID } + "Failed to cache quiz data in Valkey");
    }

    return quiz;
  }

  /**
   * @param {string} sessionId
   * @param {string} questionId
   * @returns {Promise<void>}
   */
  async gotoNextQuestion(sessionId, questionId) {
    logger.info("entering gotoNextQuestion()");
    await this.valkeyRepository.set(
      `currentSessionQuestion:${sessionId}`,
      questionId,
      3600,
    );
  }

  /**
   * @param {string} sessionId
   * @param {string} questionId
   * @param {string | null} choiceId
   * @param {string} participantId
   * @returns {Promise<boolean>}
   */
  async getIsCorrectFromCache(sessionId, questionId, choiceId, participantId) {
    logger.info(
      "entering getIsCorrectFromCache() and getting quizId from cache",
    );
    let quizId = await this.valkeyRepository.get(`sessionQuizId:${sessionId}`);
    if (!quizId) {
      logger.info(
        "getIsCorrectFromCache : quizId not found in cache, trying to recover from handleQuizNotFound()",
      );
      const cached = await this.handleQuizNotFound(sessionId, participantId);
      quizId = cached
        ? /** @type {string} */ (cached)
        : await this.valkeyRepository.get(`sessionQuizId:${sessionId}`);
      if (!quizId) {
        throw new Error(ResponseError.QUIZ_NOT_FOUND);
      }
    }

    let cached = await this.valkeyRepository.get(`quiz:${quizId}`);

    if (!cached) {
      logger.warn(
        "getIsCorrectFromCache: quizz not found, trying to recover from handleQuizNotFound()",
      );
      cached = await this.handleQuizNotFound(sessionId, participantId);
      if (!cached) {
        throw new Error(ResponseError.QUIZ_NOT_FOUND);
      }
    }

    const quiz = /** @type {import('common-contracts').Quizz} */ (cached);

    const question = quiz.questions?.find((q) => q.id === questionId);

    if (!question) {
      logger.error("getIsCorrectFromCache: question = null");
      throw new Error(ResponseError.QUESTION_NOT_FOUND);
    }

    const choice = question.choices?.find((c) => c.id === choiceId);

    if (!choice) {
      logger.error("getIsCorrectFromCache: choice = null");
      throw new Error(ResponseError.CHOICE_NOT_FOUND);
    }

    return choice.is_correct;
  }

  getSessionToken(participantId, sessionId) {
    const payload = {
      userId: participantId,
      participantId,
      sessionId,
      type: TokenType.INTERNAL,
      source: "ms-response",
    };

    return CryptoService.sign(payload, this.getKey(), {
      expiresIn: "30s",
    });
  }

  /**
   * @param {string} _sessionId
   * @param {string} participantID
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<string | null>}
   */
  async handleQuizNotFound(_sessionId, participantID, headers = {}) {
    const internalToken = this.getSessionToken(participantID, _sessionId);
    const sessionRequestHeaders = {
      ...headers,
      "internal-token": internalToken,
    };

    const session = await this.sessionClient.getSession(sessionRequestHeaders);

    await this.fetchQuizz(session.quizz_id, session.host_id, headers);

    await this.valkeyRepository.set(
      `sessionQuizId:${_sessionId}`,
      session.quizz_id,
      3600,
    );

    await this.valkeyRepository.set(
      `currentSessionQuestion:${_sessionId}`,
      session.current_question_id,
      3600,
    );

    return session.quizz_id;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<{participantId: string, score: number}[]>}
   */
  async getLeaderboard(sessionId) {
    const responses = await this.responseRepository.findBySession(sessionId);
    const scores = responses.reduce((acc, curr) => {
      if (curr.isCorrect) {
        acc[curr.participantId] = (acc[curr.participantId] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(scores)
      .map(([participantId, score]) => ({
        participantId,
        score: /** @type {number} */ (score),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * @param {string} questionId
   * @param {string} sessionId
   * @returns {Promise<{choiceId: string, count: number}[]>}
   */
  async getQuestionStats(questionId, sessionId) {
    const responses = await this.responseRepository.findByQuestionAndSession(
      questionId,
      sessionId,
    );
    const stats = responses.reduce((acc, curr) => {
      if (curr.choiceId) {
        acc[curr.choiceId] = (acc[curr.choiceId] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(stats).map(([choiceId, count]) => ({
      choiceId,
      count: /** @type {number} */ (count),
    }));
  }
}
