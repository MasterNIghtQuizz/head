import { describe, it, expect, vi, beforeEach } from "vitest";
import { KafkaProducer } from "../producer.js";
import { createMockKafkaClient, createMockProducer } from "./kafka-fake-factory.js";
import type { Kafka, Producer } from "kafkajs";

describe("KafkaProducer", () => {
  let mockProducer: Producer;
  let mockKafkaClient: Kafka;

  beforeEach(() => {
    mockProducer = createMockProducer();
    mockKafkaClient = createMockKafkaClient(mockProducer, undefined as any);
    vi.clearAllMocks();
  });

  it("should initialize with the kafka client producer", () => {
    const kafkaProducer = new KafkaProducer(mockKafkaClient);
    expect(mockKafkaClient.producer).toHaveBeenCalledTimes(1);
    expect(kafkaProducer.isConnected).toBe(false);
  });

  it("should connect to the broker", async () => {
    const kafkaProducer = new KafkaProducer(mockKafkaClient);
    await kafkaProducer.connect();

    expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    expect(kafkaProducer.isConnected).toBe(true);
  });

  it("should not reconnect if already connected", async () => {
    const kafkaProducer = new KafkaProducer(mockKafkaClient);
    kafkaProducer.isConnected = true;

    await kafkaProducer.connect();
    expect(mockProducer.connect).not.toHaveBeenCalled();
  });

  it("should disconnect from the broker", async () => {
    const kafkaProducer = new KafkaProducer(mockKafkaClient);
    kafkaProducer.isConnected = true;

    await kafkaProducer.disconnect();

    expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
    expect(kafkaProducer.isConnected).toBe(false);
  });

  it("should publish a message", async () => {
    const kafkaProducer = new KafkaProducer(mockKafkaClient);
    const topic = "test-topic";
    const payload = { userId: "123" };
    const headers = { "x-custom-header": "test" };

    await kafkaProducer.publish(topic, payload, headers);

    expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    expect(mockProducer.send).toHaveBeenCalledWith({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
          headers,
        },
      ],
    });
  });

  it("should throw an error if publish fails", async () => {
    vi.mocked(mockProducer.send).mockRejectedValue(new Error("Network Error"));
    const kafkaProducer = new KafkaProducer(mockKafkaClient);

    await expect(
      kafkaProducer.publish("test-topic", { data: 1 })
    ).rejects.toThrow("Network Error");
  });
});
