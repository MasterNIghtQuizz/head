import { call } from "common-axios";
import { BaseService } from "common-core";
import { TokenType } from "common-auth";
import { CryptoService } from "common-crypto";
import { config } from "../../../config.js";
import logger from "../../../logger.js";

export class ResponseService extends BaseService {
  constructor(responseRepository, quizClient) {
    super();
    this.responseRepository = responseRepository;
    this.quizClient = quizClient;
    this.valkeyRepository = responseRepository.valkeyRepository;
  }

  async handleAnswer(event) {
    const isBuzzer = event.is_correct !== undefined;

    if (!isBuzzer) {
      const existing =
        await this.responseRepository.findByParticipantAndQuestion(
          event.participantId,
          event.questionId,
        );

      if (existing) {
        throw new Error("ALREADY_ANSWERED");
      }
    }

    const response = {
      participantId: event.participantId,
      questionId: event.questionId,
      sessionId: event.sessionId,
      choiceId: event.choice_id ?? null,
      isCorrect: isBuzzer ? event.is_correct : null,
      submittedAt: new Date(),
    };

    // if (response.isCorrect == null) {
    //   try {
    //     response.isCorrect = await this.getIsCorrectFromCache(
    //       response.quizId,
    //       response.questionId,
    //       response.choice_id,
    //     );
    //   }
    //   catch {
    //     throw new Error("QUIZ_SERVICE_ERROR");
    //   }
    // }

    let saved;

    try {
      saved = await this.responseRepository.create(response);
    } catch (e) {
      throw new Error("DB_ERROR");
    }
    return saved;
  }

  getToken(hostId) {
    logger.info("generating internal token");
    const payload = {
      userId: hostId,
      type: TokenType.INTERNAL,
      source: "api-gateway",
    };
    const expiresIn = "30s";

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

  getKey() {
    return config.auth.internal.privateKeyPath;
  }

  async getResponsesByParticipant(participantId, sessionId) {
    return this.responseRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
  }

  async getResponsesByQuestion(questionId, sessionId) {
    return this.responseRepository.findByQuestionAndSession(
      questionId,
      sessionId,
    );
  }

  async getAllSessionResponses(sessionId) {
    return this.responseRepository.findBySession(sessionId);
  }

  async clearSession(sessionId) {
    await this.responseRepository.deleteBySessionId(sessionId);
  }

  async fetchQuizz(quizzID, hostId, request) {
    const cacheKey = `quiz:${quizzID}`;
    //const cached = await this.valkeyRepository.get(cacheKey);
    // if (cached) {
    //   return JSON.parse(cached);
    // }
    const internalToken = this.getToken(hostId);
    logger.info({ internalToken } + "internal token");
    request.headers["internal-token"] = internalToken;
    request.internalToken = internalToken;
    let quiz;
    quiz = await call({
      url: `http://localhost:4002/quizzes/${quizzID}`,
      method: "GET",
      headers: request.headers,
    });

    if (!quiz) {
      throw new Error("QUIZ_NOT_FOUND");
    }
    try {
      await this.valkeyRepository.set(
        cacheKey,
        JSON.stringify(quiz),
        this.ttl ?? 3600,
      );
    } catch (e) {
      console.warn("Valkey set failed", e);
    }
    return quiz;
  }

  async getIsCorrectFromCache(quizId, questionId, choiceId) {
    const cacheKey = `quiz:${quizId}`;

    let cached = await this.valkeyRepository.get(cacheKey);

    if (!cached) {
      cached = await this.fetchQuizz(quizId);
      if (!cached) {
        throw new Error("QUIZ_NOT_FOUND");
      }
    }

    const quiz = JSON.parse(cached);

    const question = quiz.questions?.find((q) => q.id === questionId);

    if (!question) {
      throw new Error("QUESTION_NOT_FOUND");
    }

    const choice = question.choices?.find((c) => c.id === choiceId);

    if (!choice) {
      throw new Error("CHOICE_NOT_FOUND");
    }

    return choice.is_correct;
  }
}
