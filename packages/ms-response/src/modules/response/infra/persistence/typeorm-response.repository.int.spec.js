import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { DataSource } from "typeorm";
import { Redis } from "ioredis";
import { TypeOrmResponseRepository } from "./typeorm-response.repository.js";
import { TypeOrmResponseModel } from "../models/response.model.js";
import { ResponseEntity } from "../../core/entities/response.entity.js";

const TEST_PG_HOST = process.env.POSTGRES_HOST ?? "localhost";
const TEST_PG_PORT = Number(process.env.POSTGRES_PORT ?? 5434);
const TEST_PG_USER = process.env.POSTGRES_USER ?? "postgres";
const TEST_PG_PASSWORD = process.env.POSTGRES_PASSWORD ?? "postgres_password";
const TEST_PG_DB = process.env.POSTGRES_DB ?? "ms_response_test_db";

const TEST_VALKEY_HOST = process.env.VALKEY_HOST ?? "localhost";
const TEST_VALKEY_PORT = Number(process.env.VALKEY_PORT ?? 6381);

describe("TypeOrmResponseRepository Integration Tests", () => {
  /** @type {DataSource} */
  let dataSource;

  /** @type {Redis} */
  let redisClient;

  /** @type {import('common-valkey').ValkeyRepository} */
  let valkeyRepository;

  /** @type {TypeOrmResponseRepository} */
  let repository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "postgres",
      host: TEST_PG_HOST,
      port: TEST_PG_PORT,
      username: TEST_PG_USER,
      password: TEST_PG_PASSWORD,
      database: TEST_PG_DB,
      entities: [TypeOrmResponseModel],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });

    await dataSource.initialize();

    redisClient = new Redis({
      host: TEST_VALKEY_HOST,
      port: TEST_VALKEY_PORT,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await redisClient.connect();

    valkeyRepository =
      /** @type {import('common-valkey').ValkeyRepository} */ ({
        get: /** @param {string} key */ async (key) => {
          const data = await redisClient.get(key);
          if (!data) {
            return null;
          }
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        },
        set: /** @param {string} key @param {any} value @param {number} [ttl] */ async (
          key,
          value,
          ttl,
        ) => {
          const serialized =
            typeof value === "string" ? value : JSON.stringify(value);
          if (ttl) {
            await redisClient.set(key, serialized, "EX", ttl);
          } else {
            await redisClient.set(key, serialized);
          }
        },
        del: /** @param {string} key */ async (key) => {
          await redisClient.del(key);
        },
        delByPattern: /** @param {string} pattern */ async (pattern) => {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(...keys);
          }
        },
      });

    repository = new TypeOrmResponseRepository(dataSource, valkeyRepository);
  }, 30_000);

  afterAll(async () => {
    await redisClient?.flushdb();
    await redisClient?.quit();
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.getRepository("ResponseModel").clear();
    await redisClient.flushdb();
  });

  /** @param {Partial<import('common-contracts').ResponseProps>} [overrides] */
  function buildEntity(overrides = {}) {
    return new ResponseEntity(
      /** @type {import('common-contracts').ResponseProps} */ ({
        participantId: "11111111-1111-1111-1111-111111111111",
        questionId: "22222222-2222-2222-2222-222222222222",
        sessionId: "33333333-3333-3333-3333-333333333333",
        choiceId: "44444444-4444-4444-4444-444444444444",
        isCorrect: true,
        submittedAt: new Date(),
        ...overrides,
      }),
    );
  }

  describe("create", () => {
    it("should persist a response and return it with a generated id", async () => {
      const entity = buildEntity();

      const result = await repository.create(entity);

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.id).not.toBe("");
      expect(result.participantId).toBe(entity.participantId);
      expect(result.questionId).toBe(entity.questionId);
      expect(result.sessionId).toBe(entity.sessionId);
      expect(result.choiceId).toBe(entity.choiceId);
      expect(result.isCorrect).toBe(true);
    });

    it("should persist a response with null choiceId (buzzer)", async () => {
      const entity = buildEntity({ choiceId: null, isCorrect: false });

      const result = await repository.create(entity);

      expect(result.choiceId).toBeNull();
      expect(result.isCorrect).toBe(false);
    });
  });

  describe("findByParticipantAndQuestion", () => {
    it("should find an existing response", async () => {
      const entity = buildEntity();
      await repository.create(entity);

      const found = await repository.findByParticipantAndQuestion(
        entity.participantId,
        entity.questionId,
      );

      expect(found).toBeDefined();
      expect(found?.participantId).toBe(entity.participantId);
      expect(found?.questionId).toBe(entity.questionId);
    });

    it("should return null when no match", async () => {
      const result = await repository.findByParticipantAndQuestion(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      );

      expect(result).toBeNull();
    });
  });

  describe("findByParticipantAndSession", () => {
    it("should return all responses for participant in session", async () => {
      const participantId = "11111111-1111-1111-1111-111111111111";
      const sessionId = "33333333-3333-3333-3333-333333333333";

      await repository.create(
        buildEntity({
          questionId: "aaaa1111-1111-1111-1111-111111111111",
        }),
      );
      await repository.create(
        buildEntity({
          questionId: "aaaa2222-2222-2222-2222-222222222222",
        }),
      );

      const results = await repository.findByParticipantAndSession(
        participantId,
        sessionId,
      );

      expect(results).toHaveLength(2);
    });

    it("should return empty array when no match", async () => {
      const results = await repository.findByParticipantAndSession(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      );

      expect(results).toEqual([]);
    });
  });

  describe("findByQuestionAndSession", () => {
    it("should return all responses for a question in a session", async () => {
      const questionId = "22222222-2222-2222-2222-222222222222";
      const sessionId = "33333333-3333-3333-3333-333333333333";

      await repository.create(
        buildEntity({
          participantId: "cccc1111-1111-1111-1111-111111111111",
        }),
      );
      await repository.create(
        buildEntity({
          participantId: "cccc2222-2222-2222-2222-222222222222",
        }),
      );
      await repository.create(
        buildEntity({
          participantId: "cccc3333-3333-3333-3333-333333333333",
          questionId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        }),
      );

      const results = await repository.findByQuestionAndSession(
        questionId,
        sessionId,
      );

      expect(results).toHaveLength(2);
    });
  });

  describe("findBySession", () => {
    it("should return all responses in a session", async () => {
      const sessionId = "33333333-3333-3333-3333-333333333333";

      await repository.create(buildEntity());
      await repository.create(
        buildEntity({
          participantId: "eeee1111-1111-1111-1111-111111111111",
          questionId: "eeee2222-2222-2222-2222-222222222222",
        }),
      );

      const results = await repository.findBySession(sessionId);

      expect(results).toHaveLength(2);
    });
  });

  describe("findByParticipant", () => {
    it("should return all responses for a participant", async () => {
      await repository.create(buildEntity());
      await repository.create(
        buildEntity({
          sessionId: "ffff1111-1111-1111-1111-111111111111",
          questionId: "ffff2222-2222-2222-2222-222222222222",
        }),
      );

      const results = await repository.findByParticipant(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(results).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("should update an existing response", async () => {
      const created = await repository.create(buildEntity());

      const updated = new ResponseEntity({
        ...created,
        isCorrect: false,
      });

      await repository.update(/** @type {string} */ (created.id), updated);

      const found = await repository.findByParticipantAndQuestion(
        created.participantId,
        created.questionId,
      );

      expect(found?.isCorrect).toBe(false);
    });
  });

  describe("deleteBySessionId", () => {
    it("should delete all responses for a session", async () => {
      const sessionId = "33333333-3333-3333-3333-333333333333";

      await repository.create(buildEntity());
      await repository.create(
        buildEntity({
          participantId: "aaaa1111-1111-1111-1111-111111111111",
          questionId: "aaaa2222-2222-2222-2222-222222222222",
        }),
      );

      await repository.deleteBySessionId(sessionId);

      const results = await repository.findBySession(sessionId);
      expect(results).toHaveLength(0);
    });

    it("should not affect other sessions", async () => {
      const sessionToKeep = "99999999-9999-9999-9999-999999999999";

      await repository.create(buildEntity());
      await repository.create(
        buildEntity({
          sessionId: sessionToKeep,
          participantId: "bbbb1111-1111-1111-1111-111111111111",
          questionId: "bbbb2222-2222-2222-2222-222222222222",
        }),
      );

      await repository.deleteBySessionId(
        "33333333-3333-3333-3333-333333333333",
      );

      const remaining = await repository.findBySession(sessionToKeep);
      expect(remaining).toHaveLength(1);
    });
  });

  describe("valkey caching integration", () => {
    it("should expose valkeyRepository for cache operations", async () => {
      await repository.valkeyRepository.set("test-key", "test-value", 60);

      const value = await repository.valkeyRepository.get("test-key");

      expect(value).toBe("test-value");
    });

    it("should cache and retrieve JSON objects", async () => {
      const quiz = { id: "quiz-1", title: "Test Quiz" };
      await repository.valkeyRepository.set("quiz:quiz-1", quiz, 60);

      const cached = await repository.valkeyRepository.get("quiz:quiz-1");

      expect(cached).toEqual(quiz);
    });

    it("should delete a cached key", async () => {
      await repository.valkeyRepository.set("delete-me", "value", 60);
      await repository.valkeyRepository.del("delete-me");

      const result = await repository.valkeyRepository.get("delete-me");

      expect(result).toBeNull();
    });
  });
});
