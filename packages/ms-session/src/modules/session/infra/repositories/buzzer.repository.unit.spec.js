import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuzzerRepository } from "./buzzer.repository.js";

/**
 * @typedef {import('vitest').MockedObject<{
 *   rpush: Function,
 *   lindex: Function,
 *   lpop: Function,
 *   del: Function,
 *   lrange: Function
 * }>} RedisClientMock
 *
 * @typedef {import('vitest').MockedObject<{
 *   client: RedisClientMock
 * }>} ValkeyServiceMock
 */

describe("BuzzerRepository unit tests", () => {
  /** @type {BuzzerRepository} */
  let repository;
  /** @type {RedisClientMock} */
  let redisClientMock;
  /** @type {ValkeyServiceMock} */
  let valkeyServiceMock;

  beforeEach(() => {
    // @ts-ignore
    redisClientMock = {
      rpush: vi.fn(),
      lindex: vi.fn(),
      lpop: vi.fn(),
      del: vi.fn(),
      lrange: vi.fn(),
    };

    // @ts-ignore
    valkeyServiceMock = {
      client: redisClientMock,
    };

    // @ts-ignore
    repository = new BuzzerRepository(valkeyServiceMock);
  });

  describe("constructor", () => {
    it("should initialize with redis client from valkeyService", () => {
      expect(repository.client).toBe(redisClientMock);
    });
  });

  describe("push", () => {
    it("should call rpush with correct key and serialized entry", async () => {
      const sessionId = "session-123";
      const entry = {
        sessionId,
        participantId: "user-1",
        choiceId: "choice-A",
        submittedAt: new Date().toISOString(),
      };
      redisClientMock.rpush.mockResolvedValue(1);

      const result = await repository.push(sessionId, entry);

      expect(redisClientMock.rpush).toHaveBeenCalledWith(
        `session:${sessionId}:buzzer_queue`,
        JSON.stringify(entry),
      );
      expect(result).toBe(1);
    });

    it("should propagate errors from redis client", async () => {
      redisClientMock.rpush.mockRejectedValue(new Error("Redis error"));
      await expect(repository.push("s1", {})).rejects.toThrow("Redis error");
    });
  });

  describe("peek", () => {
    it("should return parsed entry if data exists in redis", async () => {
      const sessionId = "session-123";
      const entry = {
        sessionId,
        participantId: "user-1",
        choiceId: null,
        submittedAt: new Date().toISOString(),
      };
      redisClientMock.lindex.mockResolvedValue(JSON.stringify(entry));

      const result = await repository.peek(sessionId);

      expect(redisClientMock.lindex).toHaveBeenCalledWith(
        `session:${sessionId}:buzzer_queue`,
        0,
      );
      expect(result).toEqual(entry);
    });

    it("should return null if no data in redis", async () => {
      const sessionId = "session-123";
      redisClientMock.lindex.mockResolvedValue(null);

      const result = await repository.peek(sessionId);

      expect(result).toBeNull();
    });

    it("should propagate errors from redis client", async () => {
      redisClientMock.lindex.mockRejectedValue(new Error("Redis error"));
      await expect(repository.peek("s1")).rejects.toThrow("Redis error");
    });
  });

  describe("pop", () => {
    it("should call lpop with correct key", async () => {
      const sessionId = "session-123";
      await repository.pop(sessionId);

      expect(redisClientMock.lpop).toHaveBeenCalledWith(
        `session:${sessionId}:buzzer_queue`,
      );
    });

    it("should propagate errors from redis client", async () => {
      redisClientMock.lpop.mockRejectedValue(new Error("Redis error"));
      await expect(repository.pop("s1")).rejects.toThrow("Redis error");
    });
  });

  describe("clear", () => {
    it("should call del with correct key", async () => {
      const sessionId = "session-123";
      await repository.clear(sessionId);

      expect(redisClientMock.del).toHaveBeenCalledWith(
        `session:${sessionId}:buzzer_queue`,
      );
    });

    it("should propagate errors from redis client", async () => {
      redisClientMock.del.mockRejectedValue(new Error("Redis error"));
      await expect(repository.clear("s1")).rejects.toThrow("Redis error");
    });
  });

  describe("hasBuzzed", () => {
    it("should return true if participantId is in the queue", async () => {
      const sessionId = "session-123";
      const participantId = "user-1";
      const queue = [
        JSON.stringify({
          participantId: "user-2",
          submittedAt: new Date().toISOString(),
        }),
        JSON.stringify({
          participantId: "user-1",
          submittedAt: new Date().toISOString(),
        }),
      ];
      redisClientMock.lrange.mockResolvedValue(queue);

      const result = await repository.hasBuzzed(sessionId, participantId);

      expect(redisClientMock.lrange).toHaveBeenCalledWith(
        `session:${sessionId}:buzzer_queue`,
        0,
        -1,
      );
      expect(result).toBe(true);
    });

    it("should return false if participantId is not in the queue", async () => {
      const sessionId = "session-123";
      const participantId = "user-3";
      const queue = [
        JSON.stringify({
          participantId: "user-2",
          submittedAt: new Date().toISOString(),
        }),
        JSON.stringify({
          participantId: "user-1",
          submittedAt: new Date().toISOString(),
        }),
      ];
      redisClientMock.lrange.mockResolvedValue(queue);

      const result = await repository.hasBuzzed(sessionId, participantId);

      expect(result).toBe(false);
    });

    it("should return false if queue is empty", async () => {
      const sessionId = "session-123";
      redisClientMock.lrange.mockResolvedValue([]);

      const result = await repository.hasBuzzed(sessionId, "any");

      expect(result).toBe(false);
    });

    it("should throw if lrange fails", async () => {
      redisClientMock.lrange.mockRejectedValue(new Error("Redis error"));
      await expect(repository.hasBuzzed("s1", "u1")).rejects.toThrow(
        "Redis error",
      );
    });
  });
});
