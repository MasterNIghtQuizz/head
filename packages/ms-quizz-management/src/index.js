import { initTracing } from "common-monitoring";
import { config } from "./config.js";
import { Config } from "common-config";

initTracing({
  serviceName: "ms-quizz-management",
  enabled: config.otel.enabled,
  exporterUrl: config.otel.exporterUrl,
});

import "reflect-metadata";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { initDatabase, db } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ProcessedEventEntity } from "common-database";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { createMetricsPlugin, KafkaLagCollector } from "common-metrics";
import { UserEventsConsumer } from "./infrastructure/kafka/consumers/user-events.consumer.js";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { QuizService } from "./modules/quiz/services/quiz.service.js";
import { TypeOrmQuizRepository as QuizRepository } from "./modules/quiz/infra/persistence/typeorm-quiz.repository.js";
import { ControllerFactory } from "common-core";
import { QuizController } from "./modules/quiz/controllers/quiz.controller.js";
import { TestingController } from "./modules/quiz/controllers/testing.controller.js";
import { TypeOrmChoiceRepository as ChoiceRepository } from "./modules/quiz/infra/persistence/typeorm-choice.repository.js";
import { ChoiceService } from "./modules/quiz/services/choice.service.js";
import { QuestionService } from "./modules/quiz/services/question.service.js";
import { TypeOrmQuestionRepository as QuestionRepository } from "./modules/quiz/infra/persistence/typeorm-question.repository.js";
import { ChoiceController } from "./modules/quiz/controllers/choice.controller.js";
import { QuestionController } from "./modules/quiz/controllers/question.controller.js";
import { ChoiceResponseSchema } from "./modules/quiz/contracts/choice.dto.js";
import { QuestionResponseSchema } from "./modules/quiz/contracts/question.dto.js";
import {
  QuizResponseSchema,
  QuizAnswersResponseSchema,
  FullQuizResponseSchema,
  QuizIdsResponseSchema,
} from "./modules/quiz/contracts/quiz.dto.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
  });
  fastify.addSchema(ChoiceResponseSchema);
  fastify.addSchema(QuestionResponseSchema);
  fastify.addSchema(QuizResponseSchema);
  fastify.addSchema(QuizAnswersResponseSchema);
  fastify.addSchema(FullQuizResponseSchema);
  fastify.addSchema(QuizIdsResponseSchema);
  const metricsEnabled = /** @type {{ enabled: boolean }} */ (
    Config.get("metrics")
  ).enabled;
  await fastify.register(
    createMetricsPlugin({
      serviceName: "ms-quizz-management",
      enabled: metricsEnabled,
    }),
  );

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
    return { status: "ok", service: "ms-quizz-management" };
  });

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "MS Quizz Management",
    description: "Quizz Management Service API",
    version: "1.0.0",
  });

  await initDatabase();
  const valkeyService = new ValkeyService(config.valkey);
  if (config.valkey.enabled) {
    valkeyService.connect().catch((_err) => {
      // Handled internally by ValkeyService logs
    });
  }
  const valkeyRepository = new ValkeyRepository(valkeyService);
  const valkeyTtl = config.valkey.ttl ?? 3600;

  let kafkaConsumer = null;
  if (config.kafka.enabled) {
    const kafkaClient = createKafkaClient({
      clientId: "ms-quizz-management",
      brokers: config.kafka.brokers,
    });

    kafkaConsumer = new KafkaConsumer(kafkaClient, {
      groupId: "ms-quizz-management-group",
    });

    const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);
    new UserEventsConsumer(kafkaConsumer, processedEventRepo).register();

    try {
      await kafkaConsumer.start();
    } catch (error) {
      logger.error(
        { error },
        "Kafka connection failed. Service will start without Kafka consumer.",
      );
    }

    if (metricsEnabled) {
      const lagCollector = new KafkaLagCollector(kafkaClient, [
        { groupId: "ms-quizz-management-group", topics: ["user.events"] },
      ]);
      lagCollector.start();
    }
  }

  const questionRepository = new QuestionRepository(
    db.instance,
    valkeyRepository,
  );
  const quizRepository = new QuizRepository(db.instance, valkeyRepository);
  const choiceRepository = new ChoiceRepository(db.instance, valkeyRepository);

  const quizService = new QuizService(quizRepository, valkeyTtl);
  ControllerFactory.register(fastify, QuizController, [quizService]);

  const choiceService = new ChoiceService(
    choiceRepository,
    questionRepository,
    valkeyTtl,
  );
  ControllerFactory.register(fastify, ChoiceController, [choiceService]);

  const questionService = new QuestionService(questionRepository, valkeyTtl);
  ControllerFactory.register(fastify, QuestionController, [questionService]);
  ControllerFactory.register(fastify, TestingController, []);

  return { fastify, kafkaConsumer, valkeyService };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fastify, kafkaConsumer, valkeyService } = await createServer();
  logger.info(
    { port: config.port, env: config.env },
    "MS Quizz Management starting...",
  );
  await fastify.listen({ host: "0.0.0.0", port: config.port });

  let shuttingDown = false;
  const shutdown = async (/** @type {string} */ signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "Starting graceful shutdown...");

    try {
      await fastify.close();
      logger.info("HTTP server closed");
    } catch (err) {
      logger.error({ err }, "Error closing HTTP server");
    }

    if (kafkaConsumer) {
      try {
        await kafkaConsumer.stop();
        logger.info("Kafka consumer stopped");
      } catch (err) {
        logger.error({ err }, "Error stopping Kafka consumer");
      }
    }

    try {
      await valkeyService.disconnect();
      logger.info("Valkey disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Valkey");
    }

    try {
      await db.disconnect();
      logger.info("Database connection closed");
    } catch (err) {
      logger.error({ err }, "Error closing database connection");
    }

    logger.info("Shutdown complete. Exiting.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
