import logger from "../logger.js";
import { SessionEventTypes } from "common-contracts";

export class SessionLoggerDemo {
  /**
   * @param {import('common-kafka').KafkaConsumer} kafkaConsumer
   */
  constructor(kafkaConsumer) {
    this.kafkaConsumer = kafkaConsumer;
  }

  register() {
    Object.values(SessionEventTypes).forEach((topic) => {
      this.kafkaConsumer.addHandler(topic, async (payload) => {
        logger.info(
          { topic, payload },
          "DEMO LOG: Received Session Event natively from Kafka",
        );
      });
    });
  }
}
