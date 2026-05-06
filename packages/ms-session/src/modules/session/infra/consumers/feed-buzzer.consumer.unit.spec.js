import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FeedBuzzerConsumer } from "./feed-buzzer.consumer.js";
import { SessionEventTypes } from "common-contracts";

/**
 * @typedef {import('vitest').Mocked<import('common-kafka').KafkaConsumer>} KafkaConsumerMock
 * @typedef {import('vitest').Mocked<import('../repositories/buzzer.repository.js').BuzzerRepository>} BuzzerRepositoryMock
 */

describe("FeedBuzzerConsumer unit tests", () => {
  /** @type {FeedBuzzerConsumer} */
  let consumer;
  /** @type {KafkaConsumerMock} */
  let kafkaConsumerMock;
  /** @type {BuzzerRepositoryMock} */
  let buzzerRepositoryMock;

  beforeEach(() => {
    // @ts-ignore
    kafkaConsumerMock = {
      addHandler: vi.fn(),
    };
    // @ts-ignore
    buzzerRepositoryMock = {
      client: { status: "ready" },
      hasBuzzed: vi.fn(),
      push: vi.fn(),
    };

    consumer = new FeedBuzzerConsumer(kafkaConsumerMock, buzzerRepositoryMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register handler for FEED_BUZZER_QUEUE", () => {
      consumer.register();
      expect(kafkaConsumerMock.addHandler).toHaveBeenCalledWith(
        SessionEventTypes.FEED_BUZZER_QUEUE,
        expect.any(Function),
      );
    });
  });

  describe("handleFeed", () => {
    const payload = {
      sessionId: "s1",
      participantId: "p1",
      username: "nick",
      questionId: "q1",
      pressedAt: "now",
    };

    it("should push to repository if participant has not buzzed", async () => {
      vi.mocked(buzzerRepositoryMock.hasBuzzed).mockResolvedValue(false);

      await consumer.handleFeed(payload);

      expect(buzzerRepositoryMock.hasBuzzed).toHaveBeenCalledWith("s1", "p1");
      expect(buzzerRepositoryMock.push).toHaveBeenCalledWith("s1", payload);
    });

    it("should reject when participant has already buzzed", async () => {
      vi.mocked(buzzerRepositoryMock.hasBuzzed).mockResolvedValue(true);

      await expect(consumer.handleFeed(payload)).rejects.toBeDefined();

      expect(buzzerRepositoryMock.push).not.toHaveBeenCalled();
    });

    it("should throw error if Valkey is not ready (Resilience)", async () => {
      buzzerRepositoryMock.client.status = "reconnecting";

      await expect(consumer.handleFeed(payload)).rejects.toThrow(
        "Valkey is not ready",
      );
      expect(buzzerRepositoryMock.hasBuzzed).not.toHaveBeenCalled();
    });

    it("should throw error if repository push fails", async () => {
      vi.mocked(buzzerRepositoryMock.hasBuzzed).mockResolvedValue(false);
      vi.mocked(buzzerRepositoryMock.push).mockRejectedValue(
        new Error("Redis error"),
      );

      await expect(consumer.handleFeed(payload)).rejects.toThrow("Redis error");
    });
  });
});
