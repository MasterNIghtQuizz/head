import logger from "common-logger";

export class KafkaAdmin {
  /**
   * @param {import('kafkajs').Kafka} kafkaClient
   */
  constructor(kafkaClient) {
    this.admin = kafkaClient.admin();
    this.isConnected = false;
  }

  /**
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    logger.debug("Connecting Kafka Admin...");
    await this.admin.connect();
    this.isConnected = true;
    logger.info("Kafka Admin connected successfully");
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    await this.admin.disconnect();
    this.isConnected = false;
    logger.info("Kafka Admin disconnected");
  }

  /**
   * Ensures that the specified topics exist, creating them if necessary.
   *
   * @param {string[]} topics
   * @returns {Promise<void>}
   */
  async ensureTopics(topics) {
    await this.connect();
    try {
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = topics.filter((t) => !existingTopics.includes(t));

      if (topicsToCreate.length > 0) {
        logger.info({ topicsToCreate }, "Creating missing Kafka topics...");
        await this.admin.createTopics({
          validateOnly: false,
          waitForLeaders: true,
          topics: topicsToCreate.map((topic) => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          })),
        });
        logger.info("Topics created successfully");
      }
    } catch (error) {
      logger.error({ error }, "Failed to ensure Kafka topics exist");
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}
