import { ControllerFactory } from "common-core";
import { HelpersController } from "../../modules/helpers/controllers/helpers.controller.js";
import { HelpersService } from "../../modules/helpers/services/helpers.service.js";
import { UserController } from "../../modules/user/controllers/user.controller.js";
import { UserService } from "../../modules/user/services/user.service.js";
import { QuizController } from "../../modules/quiz/controllers/quiz.controller.js";
import { QuizService } from "../../modules/quiz/services/quiz.service.js";
import { QuestionController } from "../../modules/quiz/controllers/question.controller.js";
import { QuestionService } from "../../modules/quiz/services/question.service.js";
import { ChoiceController } from "../../modules/quiz/controllers/choice.controller.js";
import { ChoiceService } from "../../modules/quiz/services/choice.service.js";
import { SessionService } from "../../modules/session/services/session.service.js";
import { SessionController } from "../../modules/session/controllers/session.controller.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} api
 */
export async function apiPlugin(api) {
  const jsonParser = (
    /** @type {import('fastify').FastifyRequest} */ _req,
    /** @type {string | Buffer} */ body,
    /** @type {(err: Error | null, body?: unknown) => void} */ done,
  ) => {
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
  };

  api.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    jsonParser,
  );

  const helpersService = new HelpersService();
  ControllerFactory.register(api, HelpersController, [helpersService]);

  const userService = new UserService();
  ControllerFactory.register(api, UserController, [userService]);

  const quizService = new QuizService();
  ControllerFactory.register(api, QuizController, [quizService]);

  const questionService = new QuestionService();
  ControllerFactory.register(api, QuestionController, [questionService]);

  const choiceService = new ChoiceService();
  ControllerFactory.register(api, ChoiceController, [choiceService]);

  const sessionService = new SessionService();
  ControllerFactory.register(api, SessionController, [sessionService]);

  api.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "api-gateway" };
  });
}
