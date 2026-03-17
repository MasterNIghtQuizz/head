import Fastify from "fastify";
import logger from "./logger.js";
import { config } from "./config.js";
import { registerSwagger } from "common-swagger";
import { ControllerFactory } from "common-core";
import {
  hookAccessToken,
  hookInternalTokenInterceptor,
  hookRefreshToken,
} from "common-auth";
import { hookRoles } from "./infrastructure/hooks/roles.hook.js";
import { HelpersController } from "./modules/helpers/controllers/helpers.controller.js";
import { HelpersService } from "./modules/helpers/services/helpers.service.js";
import { UserController } from "./modules/user/controllers/user.controller.js";
import { UserService } from "./modules/user/services/user.service.js";
import { QuizController } from "./modules/quiz/controllers/quiz.controller.js";
import { QuizService } from "./modules/quiz/services/quiz.service.js";
import { QuestionController } from "./modules/quiz/controllers/question.controller.js";
import { QuestionService } from "./modules/quiz/services/question.service.js";
import { ChoiceController } from "./modules/quiz/controllers/choice.controller.js";
import { ChoiceService } from "./modules/quiz/services/choice.service.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  fastify.addHook(
    "onRequest",
    hookAccessToken({ publicKeyPath: config.auth.access.publicKeyPath }),
  );
  fastify.addHook(
    "onRequest",
    hookRefreshToken({ publicKeyPath: config.auth.refresh.publicKeyPath }),
  );
  fastify.addHook(
    "onRequest",
    hookInternalTokenInterceptor({
      privateKeyPath: config.auth.internal.privateKeyPath,
      source: "api-gateway",
      expiresIn: "30s",
    }),
  );

  fastify.addHook("preHandler", hookRoles());

  // @ts-ignore
  await registerSwagger(fastify, {
    title: "API Gateway",
    description: "Quiz Master Gateway API",
    version: "1.0.0",
  });

  const helpersService = new HelpersService();
  ControllerFactory.register(fastify, HelpersController, [helpersService]);

  const userService = new UserService();
  ControllerFactory.register(fastify, UserController, [userService]);

  const quizService = new QuizService();
  ControllerFactory.register(fastify, QuizController, [quizService]);

  const questionService = new QuestionService();
  ControllerFactory.register(fastify, QuestionController, [questionService]);

  const choiceService = new ChoiceService();
  ControllerFactory.register(fastify, ChoiceController, [choiceService]);

  fastify.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "api-gateway" };
  });

  return fastify;
}
