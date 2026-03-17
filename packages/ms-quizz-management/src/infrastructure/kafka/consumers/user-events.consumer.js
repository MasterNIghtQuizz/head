import logger from "../../../logger.js";
import { Topics, UserEventTypes } from "common-contracts";

export class UserEventsConsumer {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   * @param {import('typeorm').Repository<{ id: string, topic: string, processedAt: Date }>} processedEventRepo
   */
  constructor(kafkaConsumer, processedEventRepo) {
    this.kafkaConsumer = kafkaConsumer;
    this.processedEventRepo = processedEventRepo;
  }

  register() {
    this.kafkaConsumer.addHandler(
      Topics.USER_EVENTS,
      async (message, _headers) => {
        await this.handleUserEvents(
          /** @type {import('common-contracts').UserEventMessage} */ (message),
        );
      },
    );
  }

  /**
   * @param {import('common-contracts').UserEventMessage} message
   */
  async handleUserEvents(message) {
    if (!message?.eventId) {
      logger.warn(
        "Received message without eventId, skipping idempotency check.",
      );
      return;
    }

    const existingEvent = await this.processedEventRepo.findOne({
      where: { id: message.eventId },
    });

    if (existingEvent) {
      logger.info(
        { eventId: message.eventId },
        "Event already processed, skipping. (Idempotency check passed)",
      );
      return;
    }

    if (message?.eventType === UserEventTypes.USER_CREATED) {
      await this.onUserCreated(message.payload);
    }

    await this.processedEventRepo.save({
      id: message.eventId,
      topic: Topics.USER_EVENTS,
    });
  }

  /**
   * @param {import('common-contracts').UserCreatedEventPayload} payload
   */
  async onUserCreated(payload) {
    logger.info(
      { userId: payload.userId },
      "Received USER_CREATED natively via Kafka. Initializing default Quizz profile for User...",
    );
  }
}
