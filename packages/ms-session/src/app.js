import Fastify from "fastify";
import logger from "./logger.js";
import { config } from "./config.js";
import { db, valkey, initDatabase } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ControllerFactory } from "common-core";
import { SessionController } from "./modules/session/controllers/session.controller.js";
import { SessionService } from "./modules/session/services/session.service.js";
import { createKafkaClient, KafkaProducer } from "common-kafka";
import { TypeOrmSessionRepository } from "./modules/session/infra/persistence/typeorm-session.repository.js";
import { TypeOrmParticipantRepository } from "./modules/session/infra/persistence/typeorm-participant.repository.js";
import { ParticipantService } from "./modules/session/services/participant.service.js";
import { ParticipantController } from "./modules/session/controllers/participant.controller.js";
import { ValkeyRepository } from "common-valkey";
import { TestingController } from "./modules/session/controllers/testing.controller.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
  });

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
  if (config.kafka.enabled) {
    const kafkaClient = createKafkaClient({
      clientId: "ms-session",
      brokers: config.kafka.brokers,
    });
    kafkaProducer = new KafkaProducer(kafkaClient);
    await kafkaProducer.connect();
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

  const participantService = new ParticipantService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
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
  };
}
