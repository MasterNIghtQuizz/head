import logger from "../../../../logger.js";
import { SessionEventTypes } from "common-contracts";
import { PARTICIPANT_ALREADY_BUZZED } from "../../errors/session.errors.js";

export class FeedBuzzerConsumer {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   * @param {import('../repositories/buzzer.repository.js').BuzzerRepository} buzzerRepository
   */
  constructor(kafkaConsumer, buzzerRepository) {
    this.kafkaConsumer = kafkaConsumer;
    this.buzzerRepository = buzzerRepository;
  }

  register() {
    this.kafkaConsumer.addHandler(
      SessionEventTypes.FEED_BUZZER_QUEUE,
      async (payload) => {
        await this.handleFeed(payload);
      },
    );
  }

  /**
   * @param {import('common-contracts').UserPressedBuzzerEventPayload} payload
   */
  async handleFeed(payload) {
    const { sessionId, participantId } = payload;

    if (this.buzzerRepository.client.status !== "ready") {
      logger.error(
        {
          sessionId,
          participantId,
          status: this.buzzerRepository.client.status,
        },
        "Valkey is not ready, failing task to trigger Kafka retry",
      );
      throw new Error("Valkey is not ready");
    }

    try {
      const alreadyBuzzed = await this.buzzerRepository.hasBuzzed(
        sessionId,
        participantId,
      );

      if (alreadyBuzzed) {
        logger.info(
          { sessionId, participantId },
          "Participant already in buzzer queue.",
        );
        throw PARTICIPANT_ALREADY_BUZZED(participantId);
      }

      await this.buzzerRepository.push(sessionId, payload);
      logger.info(
        { sessionId, participantId },
        "Buzzer queue updated from Kafka event",
      );
    } catch (error) {
      logger.error(
        { error, sessionId, participantId },
        "Error updating buzzer queue from Kafka, retrying...",
      );
      throw error;
    }
  }
}
