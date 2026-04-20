import logger from "../../../logger.js";
import { Topics } from "common-contracts";
import {SessionEventTypes} from "common-contracts/src/events.js";
import {CreateResponseRequestDto} from "../../../modules/response/contracts/response.dto.js";

export class ResponseEventsConsumer {
  constructor(kafkaConsumer, processedEventRepo, responseService) {
    this.kafkaConsumer = kafkaConsumer;
    this.processedEventRepo = processedEventRepo;
    this.responseService = responseService;
  }

  register() {
    this.kafkaConsumer.addHandler(
      Topics.QUIZZ_EVENTS,
      async (message) => {
        await this.handleEvent(message);
      },
    );
  }

  async handleEvent(message) {
    if (!message?.eventId) {
      logger.warn("No eventId, skipping");
      return;
    }

    const existing = await this.processedEventRepo.findOne({
      where: { id: message.eventId },
    });

    if (existing) {
      logger.info("Already processed");
      return;
    }

    try {
      switch (message.eventType) {
        case SessionEventTypes.QUIZ_RESPONSE_SUBMITTED:
          await this.onAnswerSubmitted(message.payload);
          break;

        case SessionEventTypes.SESSION_ENDED:
          await this.onSessionEnded(message.payload);
          break;

        case SessionEventTypes.SESSION_STARTED:
          await this.onSessionStarted(message.payload);
          break;

        case SessionEventTypes.SESSION_NEXT_QUESTION:
          await this.onNextQuestion(message.payload);
          break;

        default:
          logger.warn("Unknown event");
      }

      await this.processedEventRepo.save({
        id: message.eventId,
        topic: Topics.QUIZZ_EVENTS,
      });
    } catch (err) {
      logger.error(err + "Error processing event");
      throw err;
    }
  }

  async onAnswerSubmitted(payload) {
    logger.info(payload + "Processing answer");

    const { error, value } = CreateResponseRequestDto.validate(payload);
    if (error) {
      logger.warn(error + "Invalid event");
      throw new Error("INVALID_EVENT");
    }

    await this.responseService.handleAnswer(value);
  }

  async onSessionEnded(payload) {
    logger.info(payload + "Clearing session");

    await this.responseService.clearSession(payload.sessionId);
  }

  async onSessionStarted(payload) {
    logger.info(payload + "creating session");

    await this.responseService.startNewSession(payload.sessionId, payload.hostId, {});
  }

  async onNextQuestion(payload) {
    logger.info(payload + "Next question");

    await this.responseService.gotoNextQuestion(payload.sessionId, payload.questionId);
  }
}
