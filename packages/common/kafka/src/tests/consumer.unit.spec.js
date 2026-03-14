import { describe, it, expect, vi, beforeEach } from "vitest";
import { KafkaConsumer } from "../consumer.js";
import {
  createMockKafkaClient,
  createMockConsumer,
} from "./kafka-fake-factory.js";

describe("KafkaConsumer (Unit Test)", () => {
  /** @type {import('kafkajs').Consumer} */
  let mockConsumer;
  /** @type {import('kafkajs').Kafka} */
  let mockKafkaClient;
  /** @type {import('kafkajs').ConsumerConfig} */
  let config;

  beforeEach(() => {
    mockConsumer = createMockConsumer();
    mockKafkaClient = createMockKafkaClient(undefined, mockConsumer);
    config = { groupId: "test-group" };

    vi.clearAllMocks();
  });

  it("should initialize with the kafka client consumer", () => {
    const kafkaConsumer = new KafkaConsumer(mockKafkaClient, config);
    expect(mockKafkaClient.consumer).toHaveBeenCalledWith(config);
    expect(kafkaConsumer.isConnected).toBe(false);
  });

  it("should add a topic handler", () => {
    const kafkaConsumer = new KafkaConsumer(mockKafkaClient, config);
    const handler = async () => {};
    kafkaConsumer.addHandler("test-topic", handler);

    expect(kafkaConsumer.handlers.has("test-topic")).toBe(true);
    expect(kafkaConsumer.handlers.get("test-topic")).toBe(handler);
  });

  it("should connect, subscribe to registered topics, and listen to messages", async () => {
    const kafkaConsumer = new KafkaConsumer(mockKafkaClient, config);

    const handler = vi.fn();
    kafkaConsumer.addHandler("test-topic", handler);

    await kafkaConsumer.start();

    expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    expect(kafkaConsumer.isConnected).toBe(true);

    expect(mockConsumer.subscribe).toHaveBeenCalledWith({
      topic: "test-topic",
      fromBeginning: false,
    });

    expect(mockConsumer.run).toHaveBeenCalledTimes(1);

    const { eachMessage } = /** @type {any} */ (
      vi.mocked(mockConsumer.run).mock.calls[0][0]
    );
    await eachMessage({
      topic: "test-topic",
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify({ userId: "user-123" })),
        headers: { "x-correlation-id": "12345" },
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      { userId: "user-123" },
      { "x-correlation-id": "12345" },
    );
  });

  it("should gracefully disconnect", async () => {
    const kafkaConsumer = new KafkaConsumer(mockKafkaClient, config);
    kafkaConsumer.isConnected = true;

    await kafkaConsumer.stop();

    expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(kafkaConsumer.isConnected).toBe(false);
  });

  it("should gracefully handle JSON parsing errors", async () => {
    const kafkaConsumer = new KafkaConsumer(mockKafkaClient, config);

    const handler = vi.fn();
    kafkaConsumer.addHandler("test-topic", handler);

    await kafkaConsumer.start();
    const { eachMessage } = /** @type {any} */ (
      vi.mocked(mockConsumer.run).mock.calls[0][0]
    );

    await expect(
      eachMessage({
        topic: "test-topic",
        partition: 0,
        message: {
          value: Buffer.from("invalid-json"),
        },
      }),
    ).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });
});
