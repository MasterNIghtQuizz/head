// @ts-ignore
import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { db, initDatabase } from "./database.js";
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
import { initTracing } from "common-monitoring";

initTracing({
  serviceName: "ms-session",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

const fastify = Fastify({ loggerInstance: logger });

fastify.addHook(
  "onRequest",
  hookInternalToken({
    publicKeyPath: config.auth.internal.publicKeyPath,
  }),
);

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

let kafkaProducer = null;
if (config.kafka.enabled) {
  const kafkaClient = createKafkaClient({
    clientId: "ms-session",
    brokers: config.kafka.brokers,
  });
  kafkaProducer = new KafkaProducer(kafkaClient);
  await kafkaProducer.connect();
}

const sessionRepository = new TypeOrmSessionRepository(db.instance);
const participantRepository = new TypeOrmParticipantRepository(db.instance);

const valkeyService = new (await import("common-valkey")).ValkeyService(
  config.valkey,
);
valkeyService.connect();
const valkeyRepository = new (await import("common-valkey")).ValkeyRepository(
  valkeyService,
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
);
ControllerFactory.register(fastify, ParticipantController, [
  participantService,
]);

logger.info(config, "MS Session starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });

const shutdown = async () => {
  logger.info("Gracefully shutting down ms-session...");
  await kafkaProducer?.disconnect();
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
