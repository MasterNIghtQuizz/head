import Fastify from "fastify";
import { fileURLToPath } from "node:url";

import logger from "./logger.js";
import { config } from "./config.js";
import { initDatabase, db } from "./database.js";

import { TypeOrmResponseRepository } from "./modules/response/infra/persistence/typeorm-response.repository.js";
import { ResponseService } from "./modules/response/services/response.service.js";
import { QuizClient } from "./infrastructure/clients/quiz.client.js";

import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { ProcessedEventEntity } from "common-database";

import { ResponseEventsConsumer } from "./infrastructure/kafka/consumers/response-events.consumer.js";
import {ValkeyRepository, ValkeyService} from "common-valkey";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  await initDatabase();

  // -------------------------
  // REPOSITORY + SERVICE
  // -------------------------

  const valkeyService = new ValkeyService(config.valkey);
  if (config.valkey.enabled) {
    await valkeyService.connect();
  }

  const valkeyRepository = new ValkeyRepository(valkeyService);

  const responseRepo = new TypeOrmResponseRepository(
    db.instance,
    valkeyRepository,
  );

  const quizClient = new QuizClient();

  const responseService = new ResponseService(
    responseRepo,
    quizClient,
  );

  // -------------------------
  // KAFKA SETUP
  // -------------------------
  let kafkaConsumer = null;

  if (config.kafka.enabled) {
    const kafkaClient = createKafkaClient({
      clientId: "ms-response",
      brokers: config.kafka.brokers,
    });

    kafkaConsumer = new KafkaConsumer(kafkaClient, {
      groupId: "ms-response-group",
    });

    const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);

    new ResponseEventsConsumer(
      kafkaConsumer,
      processedEventRepo,
      responseService,
    ).register();

    await kafkaConsumer.start();
  }

  // -------------------------
  // HEALTH CHECK
  // -------------------------
  fastify.get("/health", async () => {
    return { status: "ok", service: "ms-response" };
  });

  return { fastify, kafkaConsumer };
}

// -------------------------
// START
// -------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fastify } = await createServer();

  logger.info(config+ "MS Response starting...");

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });

  console.log(`Server running on port ${config.port}`);
}
