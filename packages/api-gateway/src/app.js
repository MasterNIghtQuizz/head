import Fastify from "fastify";
import logger from "./logger.js";
import { config } from "./config.js";
import { registerSwagger } from "common-swagger";
import { ControllerFactory } from "common-core";
import {
  hookAccessToken,
  hookInternalTokenInterceptor,
  hookRefreshToken,
  hookGameToken,
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
import { SessionService } from "./modules/session/services/session.service.js";
import { SessionController } from "./modules/session/controllers/session.controller.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
  });

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
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
    },
  );

  fastify.addHook("onRequest", async (request) => {
    if (
      (request.method === "POST" || request.method === "PUT") &&
      !request.headers["content-type"]
    ) {
      request.headers["content-type"] = "application/json";
    }
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
    hookGameToken({ publicKeyPath: config.auth.game.publicKeyPath }),
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

  const sessionService = new SessionService();
  ControllerFactory.register(fastify, SessionController, [sessionService]);

  fastify.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "api-gateway" };
  });

  return fastify;
}
