import logger from "common-logger";

/**
 * @callback MessageHandler
 * @param {any} payload
 * @param {import('kafkajs').IHeaders} [headers]
 * @returns {Promise<void>}
 */

export class KafkaConsumer {
  /**
   * @param {import('kafkajs').Kafka} kafkaClient
   * @param {import('kafkajs').ConsumerConfig} config
   * @param {Object} [options]
   * @param {any} [options.idempotencyStore]
   */
  constructor(kafkaClient, config, options = {}) {
    this.consumer = kafkaClient.consumer(config);
    this.isConnected = false;
    this.idempotencyStore = options.idempotencyStore || null;
    /** @type {Map<string, MessageHandler>} */
    this.handlers = new Map();
  }

  /**
   *
   * @param {string} topic
   * @param {MessageHandler} handler
   */
  addHandler(topic, handler) {
    this.handlers.set(topic, handler);
  }

  /**
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isConnected) {
      return;
    }

    logger.debug("Connecting Kafka Consumer...");
    await this.consumer.connect();
    this.isConnected = true;
    logger.info("Kafka Consumer connected successfully");

    const topics = Array.from(this.handlers.keys());
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    if (topics.length > 0) {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          logger.debug({ topic, partition }, "Received Kafka message");
          const handler = this.handlers.get(topic);
          if (handler) {
            try {
              const payloadString = message.value
                ? message.value.toString()
                : null;
              const payload = payloadString ? JSON.parse(payloadString) : null;

              if (this.idempotencyStore && payload?.eventId) {
                const existing = await this.idempotencyStore.findOne({
                  where: { id: payload.eventId },
                });
                if (existing) {
                  logger.info(
                    { eventId: payload.eventId, topic },
                    "Event already processed, skipping. (Idempotency check passed)",
                  );
                  return;
                }
              }

              await handler(payload, message.headers);

              if (this.idempotencyStore && payload?.eventId) {
                await this.idempotencyStore.save({
                  id: payload.eventId,
                  topic,
                });
              }
            } catch (error) {
              logger.error(
                { error, topic, partition },
                "Error processing Kafka message",
              );
              // Note: Dead Letter Queue (DLQ) strategy can be added here
              throw error;
            }
          }
        },
      });
      logger.info({ topics }, "Kafka Consumer started listening");
    } else {
      logger.warn("Kafka Consumer started but no topics are registered");
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isConnected) {
      return;
    }
    logger.debug("Disconnecting Kafka Consumer...");
    await this.consumer.disconnect();
    this.isConnected = false;
    logger.info("Kafka Consumer stopped successfully");
  }
}
