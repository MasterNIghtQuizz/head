import logger from "../../../logger.js";
import { Topics } from "common-contracts";
import { SessionEventTypes } from "common-contracts/src/events.js";
import { CreateResponseRequestDto } from "../../../modules/response/contracts/response.dto.js";

/**
 * @typedef {{ eventId: string, eventType: string }} LogContext
 */

/**
 * @typedef {Object} ProcessedEvent
 * @property {string} id
 * @property {string} topic
 * @property {Date} [processedAt]
 */

export class ResponseEventsConsumer {
  /** @type {import('common-kafka').KafkaConsumer} */
  kafkaConsumer;

  /** @type {import('typeorm').Repository<ProcessedEvent>} */
  processedEventRepo;

  /** @type {import('../../../modules/response/services/response.service.js').ResponseService} */
  responseService;

  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   * @param {import('typeorm').Repository<ProcessedEvent>} processedEventRepo
   * @param {import('../../../modules/response/services/response.service.js').ResponseService} responseService
   */
  constructor(kafkaConsumer, processedEventRepo, responseService) {
    this.kafkaConsumer = kafkaConsumer;
    this.processedEventRepo = processedEventRepo;
    this.responseService = responseService;
  }

  register() {
    this.kafkaConsumer.addHandler(Topics.QUIZZ_EVENTS, async (message) => {
      await this.handleEvent(
        /** @type {import('common-contracts').KafkaEvent} */ (message),
      );
    });
  }

  /**
   * @param {import('common-contracts').KafkaEvent} message
   * @returns {Promise<void>}
   */
  async handleEvent(message) {
    const { eventId, eventType, payload } = message;

    if (!eventId) {
      logger.warn({ eventType }, "Message received without eventId, skipping");
      return;
    }

    /** @type {LogContext} */
    const logCtx = { eventId, eventType };

    const existing = await this.processedEventRepo.findOne({
      where: { id: eventId },
    });

    if (existing) {
      logger.info(logCtx, "Event already processed, skipping (idempotency)");
      return;
    }

    try {
      logger.info(logCtx, "Processing new event");

      switch (eventType) {
        case SessionEventTypes.QUIZ_RESPONSE_SUBMITTED:
          await this.onAnswerSubmitted(
            /** @type {import('common-contracts').QuizResponseSubmittedEventPayload} */ (
              payload
            ),
            logCtx,
          );
          break;

        case SessionEventTypes.SESSION_ENDED:
          await this.onSessionEnded(
            /** @type {import('common-contracts').SessionEndedEventPayload} */ (
              payload
            ),
            logCtx,
          );
          break;

        case SessionEventTypes.SESSION_CREATED:
          await this.onSessionStarted(
            /** @type {import('common-contracts').SessionCreatedEventPayload} */ (
              payload
            ),
            logCtx,
          );
          break;

        case SessionEventTypes.SESSION_NEXT_QUESTION:
          await this.onNextQuestion(
            /** @type {import('common-contracts').SessionNextQuestionEventPayload} */ (
              payload
            ),
            logCtx,
          );
          break;

        default:
          logger.warn(logCtx, "Unknown event type encountered");
      }

      await this.processedEventRepo.save({
        id: eventId,
        topic: Topics.QUIZZ_EVENTS,
      });

      logger.info(logCtx, "Event successfully processed and recorded");
    } catch (err) {
      const error = /** @type {Error} */ (err);
      logger.error(
        { ...logCtx, error: error.message },
        "Critical error during event processing",
      );
      throw error;
    }
  }

  /**
   * @param {import('common-contracts').QuizResponseSubmittedEventPayload} payload
   * @param {LogContext} logCtx
   * @returns {Promise<void>}
   */
  async onAnswerSubmitted(payload, logCtx) {
    logger.debug({ ...logCtx, payload }, "Executing onAnswerSubmitted");

    const { error, value } = CreateResponseRequestDto.validate(payload);
    if (error) {
      logger.warn(
        { ...logCtx, error: error.message },
        "Invalid QuizResponseSubmitted payload",
      );
      throw new Error("INVALID_EVENT_PAYLOAD");
    }

    await this.responseService.handleAnswer(
      /** @type {import('common-contracts').AnswerEvent} */ (value),
    );
  }

  /**
   * @param {import('common-contracts').SessionEndedEventPayload} payload
   * @param {LogContext} logCtx
   * @returns {Promise<void>}
   */
  async onSessionEnded(payload, logCtx) {
    logger.info(
      { ...logCtx, sessionId: payload.session_id },
      "Executing onSessionEnded",
    );
    await this.responseService.clearSession(payload.session_id);
  }

  /**
   * @param {import('common-contracts').SessionCreatedEventPayload} payload
   * @param {LogContext} logCtx
   * @returns {Promise<void>}
   */
  async onSessionStarted(payload, logCtx) {
    logger.info(
      {
        ...logCtx,
        sessionId: payload.session_id,
        hostid :  payload.participant_id,
        quizId: payload.quiz_id,
      },
      "Executing onSessionStarted",
    );
    logger.info("calling startNewSession()");
    await this.responseService.startNewSession(
      payload.session_id,
      payload.participant_id,
      payload.quiz_id,
    );
  }

  /**
   * @param {import('common-contracts').SessionNextQuestionEventPayload} payload
   * @param {LogContext} logCtx
   * @returns {Promise<void>}
   */
  async onNextQuestion(payload, logCtx) {
    logger.info(
      {
        ...logCtx,
        sessionId: payload.session_id,
        questionId: payload.question_id,
      },
      "Executing onNextQuestion",
    );

    await this.responseService.gotoNextQuestion(
      payload.session_id,
      payload.question_id,
    );
  }
}
