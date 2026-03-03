import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { initDatabase, db } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ProcessedEventEntity } from "common-database";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { UserEventsConsumer } from "./infrastructure/kafka/consumers/user-events.consumer.js";

const fastify = Fastify({ loggerInstance: logger });

fastify.addHook(
  "onRequest",
  hookInternalToken({
    publicKeyPath: config.auth.internal.publicKeyPath,
  }),
);

fastify.get("/health", { config: { isPublic: true } }, async () => {
  return { status: "ok", service: "ms-quizz-management" };
});

// @ts-ignore
await registerSwagger(fastify, {
  title: "MS Quizz Management",
  description: "Quizz Management Service API",
  version: "1.0.0",
});

await initDatabase();

const kafkaClient = createKafkaClient({
  clientId: "ms-quizz-management",
  brokers: config.kafka.brokers,
});

const kafkaConsumer = new KafkaConsumer(kafkaClient, {
  groupId: "ms-quizz-management-group",
});

const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);
new UserEventsConsumer(kafkaConsumer, processedEventRepo).register();

await kafkaConsumer.start();

logger.info(config, "MS Quizz Management starting...");

await fastify.listen({ host: "0.0.0.0", port: config.port });

const shutdown = async () => {
  logger.info("Gracefully shutting down ms-quizz-management...");
  await kafkaConsumer.stop();
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
