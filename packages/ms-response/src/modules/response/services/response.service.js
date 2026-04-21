import {call} from "common-axios";
import {BaseService} from "common-core";
import {TokenType} from "common-auth";
import {CryptoService} from "common-crypto";
import {config} from "../../../config.js";
import logger from "../../../logger.js";
import {DATABASE_ERROR} from "../errors/internal.errors.js";

export class ResponseService extends BaseService{
  constructor(responseRepository) {
    super();
    this.responseRepository = responseRepository;
    this.valkeyRepository = responseRepository.valkeyRepository;
  }

  async handleAnswer(event) {
    const isBuzzer = event.is_correct !== undefined;

    let questionId = await this.valkeyRepository.get(`currentSessionQuestion:${event.sessionId}`);
    if (!questionId) {
      await this.handleQuizNotFound(event.sessionId);
      questionId = await this.valkeyRepository.get(`currentSessionQuestion:${event.sessionId}`);
      if (!questionId) {
        throw new Error("QUIZ_NOT_FOUND");
      }
    }

    if (!isBuzzer) {
      const existing =
        await this.responseRepository.findByParticipantAndQuestion(
          event.participantId,
          questionId,
        );
      if (existing) {
        throw new Error("ALREADY_ANSWERED");
      }
    }

    const response = {
      participantId: event.participantId,
      questionId: questionId,
      sessionId: event.sessionId,
      choiceId: event.choice_id ?? null,
      isCorrect: isBuzzer ? event.is_correct : null,
      submittedAt: new Date(),
    };

    if (response.isCorrect == null) {
      try {
        response.isCorrect = await this.getIsCorrectFromCache(
          response.sessionId,
          response.questionId,
          response.choice_id,
        );
      }
      catch {
        throw new Error("QUIZ_SERVICE_ERROR");
      }
    }

    let saved;

    try {
      saved = await this.responseRepository.create(response);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    return saved;
  }

  getToken(hostId)
  {
    logger.info("generating internal token");
    const payload =  {
      userId: hostId,
      type: TokenType.INTERNAL,
      source: "api-gateway",
    };
    const expiresIn = "30s"

    logger.info("gekey test: " + this.getKey());
    logger.info("signing");
    const internalToken = CryptoService.sign(payload, this.getKey(), {
      expiresIn:
      /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (
        expiresIn
      ),
    });
    logger.info("returning internal token");
    return internalToken;
  }

  getKey(){return  config.auth.internal.privateKeyPath}


  async getResponsesByParticipant(participantId, sessionId) {
    return this.responseRepository.findByParticipantAndSession(participantId, sessionId);
  }

  async getResponsesByQuestion(questionId, sessionId) {
    return this.responseRepository.findByQuestionAndSession(questionId, sessionId);
  }

  async getAllSessionResponses(sessionId) {
    return this.responseRepository.findBySession(sessionId);
  }


  async clearSession(sessionId) {
    await this.responseRepository.deleteBySessionId(sessionId);
  }

  async startNewSession(sessionId, hostId, quizId, request) {
    await this.valkeyRepository.set(
      `sessionQuizId:${sessionId}`,
      quizId,
      3600,
    );

    const quiz = (await this.fetchQuizz(sessionId, quizId, hostId, request));
    const cacheKey = `currentSessionQuestion:${sessionId}`;

    await this.valkeyRepository.set(
      cacheKey,
      JSON.stringify(quiz.questions[0].id),
      3600,
    );
  }

  async fetchQuizz(sessionId, quizID, hostId, request) {
    const cached = await this.valkeyRepository.get(`quiz:${quizID}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const internalToken = this.getToken(hostId);
    logger.info("-fetchQuizz()- internal token : " + {internalToken});

    request.headers["internal-token"] = internalToken;
    request.internalToken = internalToken;

    const quiz = await call({
      url: `${config.services.quizz}/${quizID}`,
      method: "GET",
      headers: request.headers,
    });

    if (!quiz) {
      throw new Error("Error fetching quiz: " + quizID);
    }

    try {
      await this.valkeyRepository.set(
        `quiz:${quizID}`,
        JSON.stringify(quiz),
        3600,
      );
    } catch (e) {
      console.warn("Valkey set failed", e);
    }

    return quiz;
  }

  async gotoNextQuestion(sessionId, questionId){
    await this.valkeyRepository.set(`currentSessionQuestion:${sessionId}`, questionId, 3600);
  }

  async getIsCorrectFromCache(sessionId, questionId, choiceId) {
    let quizId = await this.valkeyRepository.get(`sessionQuizId:${sessionId}`);
    if (!quizId) {
      await this.handleQuizNotFound(sessionId);
      quizId = await this.valkeyRepository.get(`sessionQuizId:${sessionId}`);
      if (!quizId) {
        throw new Error("QUIZ_NOT_FOUND");
      }
    }

    let cached = await this.valkeyRepository.get(`quiz:${quizId}`);

    if (!cached) {
      cached = await this.handleQuizNotFound(sessionId);
      if (!cached) {
        throw new Error("QUIZ_NOT_FOUND");
      }
    }

    const quiz = JSON.parse(cached);

    const question = quiz.questions?.find(
      (q) => q.id === questionId,
    );

    if (!question) {
      throw new Error("QUESTION_NOT_FOUND");
    }

    const choice = question.choices?.find(
      (c) => c.id === choiceId,
    );

    if (!choice) {
      throw new Error("CHOICE_NOT_FOUND");
    }

    return choice.is_correct;
  }

  async handleQuizNotFound(sessionId) {
    /*TODO:
    1 - Call Get Session from session-ms
    2 - Store  `sessionQuizId:${sessionId}`
    3 - Call Get Quiz from quizz-ms
    4 - Store `quiz:${quizID}`
    5 - Store `currentSessionQuestion:${sessionId}`
     */
  }
}
