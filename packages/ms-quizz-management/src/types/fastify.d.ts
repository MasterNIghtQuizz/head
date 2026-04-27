import {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyTypeProviderDefault
} from "fastify";
import { Logger } from "pino";
import { QuizService } from "../modules/quiz/services/quiz.service.js";
import { ChoiceService } from "../modules/quiz/services/choice.service.js";
import { QuestionService } from "../modules/quiz/services/question.service.js";
import { ValkeyService } from "common-valkey";
import { KafkaConsumer } from "common-kafka";

declare module "fastify" {
  interface FastifyInstance {
    quizService: QuizService;
    choiceService: ChoiceService;
    questionService: QuestionService;
    valkeyService: ValkeyService;
    kafkaConsumer: KafkaConsumer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
