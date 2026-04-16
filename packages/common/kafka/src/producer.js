import logger from "common-logger";

export class KafkaProducer {
  /**
   * @param {import('kafkajs').Kafka} kafkaClient
   */
  constructor(kafkaClient) {
    this.producer = kafkaClient.producer({ idempotent: true });
    this.isConnected = false;
  }

  /**
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    logger.debug("Connecting Kafka Producer...");
    await this.producer.connect();
    this.isConnected = true;
    logger.info("Kafka Producer connected successfully");
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    logger.debug("Disconnecting Kafka Producer...");
    await this.producer.disconnect();
    this.isConnected = false;
    logger.info("Kafka Producer disconnected successfully");
  }

  /**
   *
   * @param {string} topic
   * @param {any} payload
   * @param {import('kafkajs').IHeaders} [headers]
   * @returns {Promise<void>}
   */
  async publish(topic, payload, headers = {}) {
    await this.connect();

    const message = {
      value: JSON.stringify(payload),
      headers,
    };

    try {
      await this.producer.send({
        topic,
        messages: [message],
      });
      logger.info({ topic }, "Message published successfully");
    } catch (error) {
      logger.error({ error, topic }, "Failed to publish Kafka message");
      throw error;
    }
  }
}
