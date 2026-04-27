import fp from "fastify-plugin";
import { ValkeyService, ValkeyRepository } from "common-valkey";
import { db } from "../../database.js";
import { config } from "../../config.js";
import { QuizService } from "../../modules/quiz/services/quiz.service.js";
import { TypeOrmQuizRepository as QuizRepository } from "../../modules/quiz/infra/persistence/typeorm-quiz.repository.js";
import { ChoiceService } from "../../modules/quiz/services/choice.service.js";
import { QuestionService } from "../../modules/quiz/services/question.service.js";
import { TypeOrmQuestionRepository as QuestionRepository } from "../../modules/quiz/infra/persistence/typeorm-question.repository.js";
import { TypeOrmChoiceRepository as ChoiceRepository } from "../../modules/quiz/infra/persistence/typeorm-choice.repository.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 */
async function servicesPluginImpl(fastify) {
  const valkeyService = new ValkeyService(config.valkey);
  if (config.valkey.enabled) {
    valkeyService.connect().catch(() => {});
  }
  const valkeyRepository = new ValkeyRepository(valkeyService);
  const valkeyTtl = config.valkey.ttl ?? 3600;

  const questionRepository = new QuestionRepository(
    db.instance,
    valkeyRepository,
  );
  const quizRepository = new QuizRepository(db.instance, valkeyRepository);
  const choiceRepository = new ChoiceRepository(db.instance, valkeyRepository);

  const quizService = new QuizService(quizRepository, valkeyTtl);
  const choiceService = new ChoiceService(
    choiceRepository,
    questionRepository,
    valkeyTtl,
  );
  const questionService = new QuestionService(questionRepository, valkeyTtl);

  fastify.decorate("quizService", quizService);
  fastify.decorate("choiceService", choiceService);
  fastify.decorate("questionService", questionService);
  fastify.decorate("valkeyService", valkeyService);
}

export const servicesPlugin = fp(servicesPluginImpl);
