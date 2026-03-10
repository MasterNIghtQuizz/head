import { vi } from "vitest";

/**
 * @returns {import('kafkajs').Producer}
 */
export const createMockProducer = () => {
  return /** @type {any} */ ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    send: vi
      .fn()
      .mockResolvedValue([
        { topicName: "test-topic", partition: 0, errorCode: 0 },
      ]),
  });
};

/**
 * @returns {import('kafkajs').Consumer}
 */
export const createMockConsumer = () => {
  return /** @type {any} */ ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    subscribe: vi.fn().mockResolvedValue(true),
    run: vi.fn().mockResolvedValue(true),
  });
};

/**
 * @param {import('kafkajs').Producer} producerInstance
 * @param {import('kafkajs').Consumer} consumerInstance
 * @returns {import('kafkajs').Kafka}
 */
export const createMockKafkaClient = (
  producerInstance = createMockProducer(),
  consumerInstance = createMockConsumer(),
) => {
  return /** @type {any} */ ({
    producer: vi.fn(() => producerInstance),
    consumer: vi.fn(() => consumerInstance),
  });
};
