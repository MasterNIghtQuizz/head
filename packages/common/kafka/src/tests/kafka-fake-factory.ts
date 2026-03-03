import { vi } from "vitest";
import type { Kafka, Producer, Consumer } from "kafkajs";

export const createMockProducer = (): Producer => {
  return {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    send: vi.fn().mockResolvedValue([
      { topicName: "test-topic", partition: 0, errorCode: 0 },
    ]),
  } as unknown as Producer;
};

export const createMockConsumer = (): Consumer => {
  return {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    subscribe: vi.fn().mockResolvedValue(true),
    run: vi.fn().mockResolvedValue(true),
  } as unknown as Consumer;
};

/**
 * @param producerInstance - The producer instance to return when kafkaClient.producer() is called.
 * @param consumerInstance - The consumer instance to return when kafkaClient.consumer() is called.
 */
export const createMockKafkaClient = (
  producerInstance: Producer = createMockProducer(),
  consumerInstance: Consumer = createMockConsumer()
): Kafka => {
  return {
    producer: vi.fn(() => producerInstance),
    consumer: vi.fn(() => consumerInstance),
  } as unknown as Kafka;
};
