import { describe, it, expect, vi } from "vitest";
import { createKafkaClient } from "../client.js";

vi.mock("kafkajs", () => {
  return {
    Kafka: vi.fn(),
    logLevel: {
      ERROR: 1,
      NOTHING: 0,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    },
  };
});

import { Kafka } from "kafkajs";

describe("createKafkaClient", () => {
  it("should create a KafkaJS client with a Pino log creator passed to the config", () => {
    const config: any = { clientId: "test", brokers: ["kafka:9092"] };

    createKafkaClient(config);

    expect(Kafka).toHaveBeenCalledTimes(1);
    expect(Kafka).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "test",
        brokers: ["kafka:9092"],
        logCreator: expect.any(Function),
      })
    );
  });
});
