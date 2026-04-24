import { BaseService } from "common-core";
import { JoinSessionResponseDto } from "../contracts/session.dto.js";
import { ParticipantEntity } from "../core/entities/participant.entity.js";
import {
  SESSION_NOT_FOUND,
  SESSION_INVALID_STATUS,
  QUESTION_TIMED_OUT,
  MISSING_CHOICE_IDS,
  INVALID_CHOICE_IDS,
  QUEUE_SYNCHRONIZING,
  UNAUTHORIZED_HOST,
  WRONG_BUZZER_CANDIDATE,
  NO_BUZZER_FOUND,
} from "../errors/session.errors.js";
import {
  QuestionType,
  ParticipantRoles,
  SessionStatus,
  SessionEventTypes,
  Topics,
} from "common-contracts";
import { TokenService, TokenType, UserRole } from "common-auth";
import { config } from "../../../config.js";
import { randomUUID } from "node:crypto";
import logger from "common-logger";
import { call } from "common-axios";
import { BadRequestError } from "common-errors";

export class ParticipantService extends BaseService {
  /** @type {import('../core/ports/session.repository.js').ISessionRepository} */
  sessionRepository;
  /** @type {import('common-kafka').KafkaProducer | null} */
  kafkaProducer;
  /** @type {import('../core/ports/participant.repository.js').IParticipantRepository} */
  participantRepository;
  /** @type {import("common-valkey").ValkeyRepository} */
  valkeyRepository;

  /** @type {import('./session.service.js').SessionService} */
  sessionService;

  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/session.repository.js').ISessionRepository} sessionRepository
   * @param {import('../core/ports/participant.repository.js').IParticipantRepository} participantRepository
   * @param {import("common-valkey").ValkeyRepository} valkeyRepository
   * @param {import('./session.service.js').SessionService} sessionService
   * @param {import('../infra/repositories/buzzer.repository.js').BuzzerRepository} buzzerRepository
   */
  constructor(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
    buzzerRepository,
  ) {
    super();
    this.sessionRepository = sessionRepository;
    this.kafkaProducer = kafkaProducer;
    this.participantRepository = participantRepository;
    this.valkeyRepository = valkeyRepository;
    this.sessionService = sessionService;
    this.buzzerRepository = buzzerRepository;
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
      throw SESSION_NOT_FOUND(data.session_public_key);
    }
    if (session.status !== SessionStatus.LOBBY) {
      throw SESSION_INVALID_STATUS(session.id);
    }
    const participantId = randomUUID();

    const participantEntity = new ParticipantEntity({
      id: participantId,
      role: ParticipantRoles.PLAYER,
      sessionId: session.id,
      nickname: data.participant_nickname,
      socketId: "",
    });
    await this.participantRepository.create(participantEntity);

    if (this.kafkaProducer) {
      /** @type {import('common-contracts').ParticipantJoinedEventPayload} */
      const payload = {
        session_id: session.id,
        participant_id: participantId,
        nickname: participantEntity.nickname,
        role: participantEntity.role,
      };
      logger.info(
        { payload },
        "DEBUG [ms-session] Publishing PARTICIPANT_JOINED event to Kafka",
      );
      await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
        eventId: randomUUID(),
        timestamp: Date.now(),
        eventType: SessionEventTypes.PARTICIPANT_JOINED,
        payload,
      });
      logger.info(
        { sessionId: session.id, participantId },
        "DEBUG [ms-session] PARTICIPANT_JOINED event published successfully",
      );
    }
    logger.info(
      {
        sessionId: session.id,
        participantId,
        nickname: data.participant_nickname,
      },
      "Participant joined session",
    );

    const gameToken = TokenService.signGameToken(
      {
        sessionId: session.id,
        participantId: participantId,
        role: UserRole.USER,
        type: TokenType.GAME,
      },
      config.auth.game.privateKeyPath,
    );

    return new JoinSessionResponseDto({
      participant_id: participantId,
      game_token: gameToken,
    });
  }

  /**
   * @param {string} participantId
   * @returns {Promise<void>}
   */
  async leaveSession(participantId) {
    const participant = await this.participantRepository.find(participantId);
    if (!participant) {
      return;
    }
    if (this.kafkaProducer) {
      /** @type {import('common-contracts').ParticipantLeftEventPayload} */
      const payload = {
        session_id: participant.sessionId,
        participant_id: participant.id,
        nickname: participant.nickname,
        role: participant.role,
      };
      await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
        eventId: randomUUID(),
        timestamp: Date.now(),
        eventType: SessionEventTypes.PARTICIPANT_LEFT,
        payload,
      });
    }

    if (participant.role === ParticipantRoles.HOST) {
      logger.info(
        { sessionId: participant.sessionId },
        "Host left, deleting session",
      );
      await this.sessionService.deleteSession(participant.sessionId);
    } else {
      await this.participantRepository.delete(participant.id);
      logger.info(
        { sessionId: participant.sessionId, participantId: participant.id },
        "Participant left session",
      );
    }
  }

  /**
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.participantId
   * @param {string[]} params.choiceIds
   * @returns {Promise<void>}
   */
  async submitResponse({ sessionId, participantId, choiceIds }) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND(sessionId);
    }

    if (session.status !== SessionStatus.QUESTION_ACTIVE) {
      throw SESSION_INVALID_STATUS(sessionId);
    }

    // eslint-disable-next-line prefer-const
    let [questionData, activatedAt] = await Promise.all([
      this.valkeyRepository.get(
        `question:${session.currentQuestionId}:validation`,
      ),
      this.valkeyRepository.get(`session:${sessionId}:question_activated_at`),
    ]).catch((err) => {
      logger.error({ err }, "Valkey error in submitResponse");
      return [null, null];
    });

    if (!questionData) {
      logger.info(
        { sessionId, questionId: session.currentQuestionId },
        "Valkey missing question validation data, fetching from management service",
      );
      try {
        const internalToken = TokenService.signInternalToken(
          {
            userId: "ms-session",
            role: UserRole.ADMIN,
            type: TokenType.INTERNAL,
          },
          config.auth.internal.privateKeyPath,
        );

        const [questionMetadata, choiceIdsList] = await Promise.all([
          call({
            url: `${config.services.quizzManagement.baseUrl}/questions/${session.currentQuestionId}`,
            method: "GET",
            headers: { "internal-token": internalToken },
          }),
          call({
            url: `${config.services.quizzManagement.baseUrl}/questions/${session.currentQuestionId}/choices/ids`,
            method: "GET",
            headers: { "internal-token": internalToken },
          }),
        ]);

        questionData = {
          id: questionMetadata.id,
          type: questionMetadata.type,
          timer_seconds: questionMetadata.timer_seconds,
          choiceIds: choiceIdsList,
        };

        try {
          await this.valkeyRepository.set(
            `question:${session.currentQuestionId}:validation`,
            questionData,
            3600,
          );
        } catch (err) {
          logger.warn(
            { err },
            "Failed to update Valkey cache after fallback fetch",
          );
        }
      } catch (error) {
        logger.error(
          { error },
          "Failed to fetch question validation data from fallback",
        );
        throw SESSION_NOT_FOUND(sessionId);
      }
    }

    const question = questionData;

    if (activatedAt && question.timer_seconds) {
      const now = Date.now();
      const limit = Number(activatedAt) + question.timer_seconds * 1000;
      if (now > limit) {
        throw QUESTION_TIMED_OUT();
      }
    } else if (question.timer_seconds) {
      logger.warn(
        { sessionId },
        "Activation time missing, skipping timer validation (potential Valkey failure)",
      );
    }

    if (question.type === QuestionType.BUZZER) {
      logger.info(
        { sessionId, participantId },
        "Handling buzzer submit for question",
      );
      await this._handleBuzzerSubmit(session, participantId);
      return;
    } else {
      const validChoiceIds = question.choiceIds || [];

      if (!choiceIds || choiceIds.length === 0) {
        throw MISSING_CHOICE_IDS();
      }

      const invalidChoiceIds = choiceIds.filter(
        (id) => !validChoiceIds.includes(id),
      );

      if (invalidChoiceIds.length > 0) {
        throw INVALID_CHOICE_IDS(invalidChoiceIds);
      }
    }
    await Promise.all(
      (choiceIds || []).map(async (choiceId) => {
        if (!this.kafkaProducer) {
          return;
        }
        /** @type {import('common-contracts').QuizResponseSubmittedEventPayload} */
        const payload = {
          sessionId,
          participantId,
          questionId: session.currentQuestionId ?? "",
          choiceId,
          submittedAt: new Date().toISOString(),
        };
        await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
          eventId: randomUUID(),
          timestamp: Date.now(),
          eventType: SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
          payload,
        });
      }),
    );

    if (
      question.type === QuestionType.BUZZER &&
      (!choiceIds || choiceIds.length === 0)
    ) {
      if (this.kafkaProducer) {
        /** @type {import('common-contracts').QuizResponseSubmittedEventPayload} */
        const payload = {
          sessionId,
          participantId,
          questionId: session.currentQuestionId ?? "",
          choiceId: null,
          type: QuestionType.BUZZER,
          submittedAt: new Date().toISOString(),
        };
        await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
          eventId: randomUUID(),
          timestamp: Date.now(),
          eventType: SessionEventTypes.QUIZ_RESPONSE_SUBMITTED,
          payload,
        });
      }
    }
    logger.info(
      {
        sessionId,
        participantId,
        questionId: session.currentQuestionId,
        choiceCount: (choiceIds || []).length,
      },
      "Response submitted and published to Kafka",
    );
  }

  /**
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.hostId
   * @param {string} params.participantId
   * @param {boolean} params.isCorrect
   * @returns {Promise<void>}
   */
  async answerBuzzer({ sessionId, hostId, participantId, isCorrect }) {
    const session = await this.sessionRepository.find(sessionId);
    if (!session) {
      throw SESSION_NOT_FOUND(sessionId);
    }

    const hostParticipant = await this.participantRepository.find(hostId);
    if (
      !hostParticipant ||
      hostParticipant.role !== ParticipantRoles.HOST ||
      hostParticipant.sessionId !== sessionId
    ) {
      throw UNAUTHORIZED_HOST();
    }

    let currentBuzzer = null;
    try {
      currentBuzzer = await this.buzzerRepository.peek(sessionId);

      if (!currentBuzzer) {
        throw NO_BUZZER_FOUND(sessionId);
      }

      if (currentBuzzer.participantId !== participantId) {
        throw WRONG_BUZZER_CANDIDATE(
          currentBuzzer.participantId,
          participantId,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestError) {
        throw err;
      }
      logger.error(
        { err, sessionId },
        "Valkey DOWN: Proceeding with answer validation without queue consistency check",
      );
    }

    let username = currentBuzzer ? currentBuzzer.username : "";
    if (!username) {
      const participant = await this.participantRepository.find(participantId);
      username = participant ? participant.nickname : "Unknown";
    }

    if (isCorrect) {
      try {
        await this.buzzerRepository.clear(sessionId);
      } catch (err) {
        logger.error({ err, sessionId }, "Failed to clear buzzer queue");
      }
    } else {
      try {
        await this.buzzerRepository.pop(sessionId);
      } catch (err) {
        logger.error({ err, sessionId }, "Failed to pop buzzer from queue");
      }
    }

    if (this.kafkaProducer) {
      /** @type {import('common-contracts').BuzzerAnswerSubmittedEventPayload} */
      const payload = {
        sessionId,
        participantId,
        username,
        isCorrect,
        timestamp: new Date().toISOString(),
      };

      await this.kafkaProducer.publish(
        SessionEventTypes.BUZZER_ANSWER_SUBMITTED,
        payload,
      );
    }

    logger.info(
      { sessionId, participantId, isCorrect },
      "Buzzer answer submitted and processed",
    );
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('common-contracts').UserPressedBuzzerEventPayload | null>}
   */
  async getCurrentBuzzer(sessionId) {
    try {
      return await this.buzzerRepository.peek(sessionId);
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to get current buzzer");
      throw QUEUE_SYNCHRONIZING();
    }
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async resetBuzzerQueue(sessionId) {
    try {
      await this.buzzerRepository.clear(sessionId);
      logger.info({ sessionId }, "Buzzer queue reset");
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to reset buzzer queue");
      throw QUEUE_SYNCHRONIZING();
    }
  }

  /**
   * @param {import('../core/entities/session.entity.js').SessionEntity} session
   * @param {string} participantId
   * @returns {Promise<void>}
   */
  async _handleBuzzerSubmit(session, participantId) {
    const participant = await this.participantRepository.find(participantId);
    if (!participant) {
      logger.warn(
        { sessionId: session.id, participantId },
        "Participant not found in buzzer submit",
      );
      return;
    }

    /**@type {import('common-contracts').UserPressedBuzzerEventPayload} */
    const payload = {
      sessionId: session.id,
      participantId,
      username: participant.nickname,
      questionId: session.currentQuestionId ?? "",
      pressedAt: String(Date.now()),
    };

    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        SessionEventTypes.FEED_BUZZER_QUEUE,
        payload,
      );
      logger.info(
        { sessionId: session.id, participantId },
        "Buzzer event published to Kafka FEED_BUZZER_QUEUE",
      );
    } else {
      try {
        await this.buzzerRepository.push(session.id, payload);
        logger.info(
          { sessionId: session.id, participantId },
          "Buzzer event pushed directly to buzzer repository",
        );
      } catch (err) {
        logger.error(
          { err, sessionId: session.id, participantId },
          "Failed to push buzzer event directly",
        );
      }
    }
  }
}
