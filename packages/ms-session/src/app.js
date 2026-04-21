import Fastify from "fastify";
import logger from "./logger.js";
import { config } from "./config.js";
import { db, valkey, initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ControllerFactory } from "common-core";
import { createMetricsPlugin, KafkaLagCollector } from "common-metrics";
import { Config } from "common-config";
import { SessionController } from "./modules/session/controllers/session.controller.js";
import { SessionService } from "./modules/session/services/session.service.js";
import {
  createKafkaClient,
  KafkaProducer,
  KafkaConsumer,
  KafkaAdmin,
} from "common-kafka";
import { SessionEventTypes } from "common-contracts";
import { SessionLoggerDemo } from "./demo/session-logger.demo.js";
import { TypeOrmSessionRepository } from "./modules/session/infra/persistence/typeorm-session.repository.js";
import { TypeOrmParticipantRepository } from "./modules/session/infra/persistence/typeorm-participant.repository.js";
import { ParticipantService } from "./modules/session/services/participant.service.js";
import { ParticipantController } from "./modules/session/controllers/participant.controller.js";
import { ValkeyRepository } from "common-valkey";
import { TestingController } from "./modules/session/controllers/testing.controller.js";
import { BuzzerRepository } from "./modules/session/infra/repositories/buzzer.repository.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
  });

  const metricsEnabled = /** @type {{ enabled: boolean }} */ (
    Config.get("metrics")
  ).enabled;
  await fastify.register(
    createMetricsPlugin({ serviceName: "ms-session", enabled: metricsEnabled }),
  );

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      if (!body || body.toString().trim() === "") {
        done(null, {});
        return;
      }
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        const error = /** @type {import('common-errors').BaseError} */ (err);
        error.statusCode = 400;
        done(error);
      }
    },
  );

  fastify.addHook("onRequest", async (request) => {
    if (
      (request.method === "POST" || request.method === "PUT") &&
      !request.headers["content-type"]
    ) {
      request.headers["content-type"] = "application/json";
    }
  });

  fastify.addHook(
    "onRequest",
    hookInternalToken({
      publicKeyPath: config.auth.internal.publicKeyPath,
    }),
  );

  fastify.addHook("onResponse", async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime),
      },
      "request completed",
    );
  });

  fastify.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "ms-session" };
  });

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "MS Session",
    description: "Session Management Service API",
    version: "1.0.0",
  });

  await initDatabase();

  /** @type {KafkaProducer | null} */
  let kafkaProducer = null;
  /** @type {KafkaConsumer | null} */
  let kafkaConsumer = null;

  if (config.kafka.enabled) {
    const kafkaClient = createKafkaClient({
      clientId: "ms-session",
      brokers: config.kafka.brokers,
    });
    const kafkaAdmin = new KafkaAdmin(kafkaClient);
    try {
      await kafkaAdmin.ensureTopics(Object.values(SessionEventTypes));
    } catch (error) {
      logger.error(
        { error },
        "Failed to ensure Kafka topics. Service might fail during production or consumption.",
      );
    }

    kafkaProducer = new KafkaProducer(kafkaClient);
    try {
      await kafkaProducer.connect();
    } catch (error) {
      logger.error(
        { error },
        "Kafka connection failed. Service will start without Kafka producer.",
      );
    }

    kafkaConsumer = new KafkaConsumer(kafkaClient, {
      groupId: "ms-session-demo-group",
    });
    const sessionLoggerDemo = new SessionLoggerDemo(kafkaConsumer);
    sessionLoggerDemo.register();

    try {
      await kafkaConsumer.start();
    } catch (error) {
      logger.error(
        { error },
        "Kafka Consumer connection failed. Demo logger will not be active.",
      );
    }

    if (metricsEnabled) {
      const lagCollector = new KafkaLagCollector(kafkaClient, [
        {
          groupId: "ms-session-demo-group",
          topics: Object.values(SessionEventTypes),
        },
      ]);
      lagCollector.start();
    }
  }

  const valkeyRepository = new ValkeyRepository(valkey);
  const sessionRepository = new TypeOrmSessionRepository(
    db.instance,
    valkeyRepository,
  );
  const participantRepository = new TypeOrmParticipantRepository(
    db.instance,
    valkeyRepository,
  );

  const sessionService = new SessionService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
  );
  ControllerFactory.register(fastify, SessionController, [sessionService]);

  const buzzerRepository = new BuzzerRepository(valkey);

  const participantService = new ParticipantService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
    buzzerRepository,
  );
  ControllerFactory.register(fastify, ParticipantController, [
    participantService,
  ]);
  ControllerFactory.register(fastify, TestingController, []);

  return {
    fastify,
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
    participantService,
    kafkaConsumer,
  };
}
