import logger from "../../../../logger.js";
import { SessionEventTypes, Topics } from "common-contracts";
import { PARTICIPANT_ALREADY_BUZZED } from "../../errors/session.errors.js";
import { randomUUID } from "node:crypto";

export class FeedBuzzerConsumer {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   * @param {import('../repositories/buzzer.repository.js').BuzzerRepository} buzzerRepository
   * @param {import('common-kafka').KafkaProducer | null} [kafkaProducer]
   */
  constructor(kafkaConsumer, buzzerRepository, kafkaProducer = null) {
    this.kafkaConsumer = kafkaConsumer;
    this.buzzerRepository = buzzerRepository;
    this.kafkaProducer = kafkaProducer;
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

      if (this.kafkaProducer) {
        await this.kafkaProducer.publish(Topics.QUIZZ_EVENTS, {
          eventId: randomUUID(),
          timestamp: Date.now(),
          eventType: SessionEventTypes.USER_PRESSED_BUZZER,
          payload: {
            session_id: sessionId,
            participant_id: participantId,
            username: payload.username,
          },
        });
        logger.info({ sessionId, participantId }, "USER_PRESSED_BUZZER event published");
      }
    } catch (error) {
      logger.error(
        { error, sessionId, participantId },
        "Error updating buzzer queue from Kafka, retrying...",
      );
      throw error;
    }
  }
}
