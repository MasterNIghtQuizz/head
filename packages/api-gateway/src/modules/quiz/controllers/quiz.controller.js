import {
  BaseController,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Schema,
  ApplyMethodDecorators,
} from "common-core";

export class QuizController extends BaseController {
  /**
   * @param {import('../services/quiz.service.js').QuizService} quizService
   */
  constructor(quizService) {
    super();
    this.quizService = quizService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   */
  async getAllQuizzes(request) {
    return this.quizService.getAllQuizzes(request.headers);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   */
  async getQuizById(request) {
    return this.quizService.getQuizById(request.params.id, request.headers);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import("../services/quiz.service.js").CreateQuizRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createQuiz(request, reply) {
    const result = await this.quizService.createQuiz(
      request.body,
      request.headers,
    );
    return reply.code(201).send(result);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import("../services/quiz.service.js").UpdateQuizRequest}>} request
   */
  async updateQuiz(request) {
    return this.quizService.updateQuiz(
      request.params.id,
      request.body,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteQuiz(request, reply) {
    await this.quizService.deleteQuiz(request.params.id, request.headers);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(QuizController, "getAllQuizzes", [
  Schema({
    description: "Get all quizzes",
    tags: ["Quiz"],
    response: {
      200: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuizController, "getQuizById", [
  Schema({
    description: "Get quiz by id",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
    response: {
      200: { type: "object", additionalProperties: true },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuizController, "createQuiz", [
  Schema({
    description: "Create a new quiz",
    tags: ["Quiz"],
    body: { type: "object", additionalProperties: true },
    response: {
      201: { type: "object", additionalProperties: true },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuizController, "updateQuiz", [
  Schema({
    description: "Update a quiz",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
    body: { type: "object", additionalProperties: true },
    response: {
      200: { type: "object", additionalProperties: true },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuizController, "deleteQuiz", [
  Schema({
    description: "Delete a quiz",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
    response: {
      204: { type: "null" },
    },
  }),
  Delete("/:id"),
]);

Controller("/quizzes")(QuizController);
