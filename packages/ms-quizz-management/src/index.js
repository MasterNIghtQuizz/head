import Fastify from "fastify";
import logger from "common-logger";
import { config } from "./config.js";
import { initDatabase, db } from "./database.js";
import { registerSwagger } from "common-swagger";
import { hookInternalToken } from "common-auth";
import { ProcessedEventEntity } from "common-database";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { UserEventsConsumer } from "./infrastructure/kafka/consumers/user-events.consumer.js";
import { QuizService } from "./modules/quiz/services/quiz.service.js";
import { QuizRepository } from "./modules/quiz/repositories/quiz.repository.js";
import { ControllerFactory } from "common-core";
import { QuizController } from "./modules/quiz/controllers/quiz.controller.js";
import { ChoiceRepository } from "./modules/quiz/repositories/choice.repository.js";
import { ChoiceService } from "./modules/quiz/services/choice.service.js";
import { QuestionService } from "./modules/quiz/services/question.service.js";
import { QuestionRepository } from "./modules/quiz/repositories/question.repository.js";
import { ChoiceController } from "./modules/quiz/controllers/choice.controller.js";
import { QuestionController } from "./modules/quiz/controllers/question.controller.js";
import { ChoiceResponseSchema } from "./modules/quiz/contracts/choice.dto.js";
import { QuestionResponseSchema } from "./modules/quiz/contracts/question.dto.js";
import { QuizResponseSchema } from "./modules/quiz/contracts/quiz.dto.js";

const fastify = Fastify({ loggerInstance: logger });
fastify.addSchema(ChoiceResponseSchema);
fastify.addSchema(QuestionResponseSchema);
fastify.addSchema(QuizResponseSchema);
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

const quizService = new QuizService(new QuizRepository(db.instance));
ControllerFactory.register(fastify, QuizController, [quizService]);
const choiceService = new ChoiceService(new ChoiceRepository(db.instance));
ControllerFactory.register(fastify, ChoiceController, [choiceService]);
const questionService = new QuestionService(
  new QuestionRepository(db.instance),
);
ControllerFactory.register(fastify, QuestionController, [questionService]);

await fastify.listen({ host: "0.0.0.0", port: config.port });

const shutdown = async () => {
  logger.info("Gracefully shutting down ms-quizz-management...");
  await kafkaConsumer.stop();
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
