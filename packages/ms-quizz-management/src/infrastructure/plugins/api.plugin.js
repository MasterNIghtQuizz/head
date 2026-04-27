import { ControllerFactory } from "common-core";
import { QuizController } from "../../modules/quiz/controllers/quiz.controller.js";
import { TestingController } from "../../modules/quiz/controllers/testing.controller.js";
import { ChoiceController } from "../../modules/quiz/controllers/choice.controller.js";
import { QuestionController } from "../../modules/quiz/controllers/question.controller.js";
import { ChoiceResponseSchema } from "../../modules/quiz/contracts/choice.dto.js";
import { QuestionResponseSchema } from "../../modules/quiz/contracts/question.dto.js";
import {
  QuizResponseSchema,
  QuizAnswersResponseSchema,
  FullQuizResponseSchema,
  QuizIdsResponseSchema,
} from "../../modules/quiz/contracts/quiz.dto.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} api
 */
export async function apiPlugin(api) {
  const quizService = api.quizService;
  const choiceService = api.choiceService;
  const questionService = api.questionService;
  api.addSchema(ChoiceResponseSchema);
  api.addSchema(QuestionResponseSchema);
  api.addSchema(QuizResponseSchema);
  api.addSchema(QuizAnswersResponseSchema);
  api.addSchema(FullQuizResponseSchema);
  api.addSchema(QuizIdsResponseSchema);

  ControllerFactory.register(api, QuizController, [quizService]);
  ControllerFactory.register(api, ChoiceController, [choiceService]);
  ControllerFactory.register(api, QuestionController, [questionService]);
  ControllerFactory.register(api, TestingController, []);

  api.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "ms-quizz-management" };
  });
}
