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

/** @type {Record<string, unknown>} */
const ErrorResponse = {
  type: "object",
  properties: { message: { type: "string" } },
};

/** @type {Record<string, unknown>} */
const QuizResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export class QuizController extends BaseController {
  /**
   * @param {import('../services/quiz.service.js').QuizService} quizService
   */
  constructor(quizService) {
    super();
    this.quizService = quizService;
  }

  /** @param {import('fastify').FastifyRequest} request */
  async getAllQuizzes(request) {
    return this.quizService.getAllQuizzes(request.headers);
  }

  /** @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request */
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
    summary: "List all quizzes",
    description:
      "Returns the full list of quizzes. Required header: `access-token`.",
    tags: ["Quiz"],
    security: [{ accessToken: [] }],
    response: {
      200: {
        description: "List of quizzes",
        type: "array",
        items: QuizResponse,
      },
      401: {
        description: "Unauthorized — missing or invalid access token",
        ...ErrorResponse,
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuizController, "getQuizById", [
  Schema({
    summary: "Get a quiz by ID",
    description:
      "Returns a single quiz by its UUID. Required header: `access-token`.",
    tags: ["Quiz"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Quiz UUID" },
      },
    },
    response: {
      200: { description: "Quiz found", ...QuizResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuizController, "createQuiz", [
  Schema({
    summary: "Create a quiz",
    description: "Creates a new quiz. Required header: `access-token`.",
    tags: ["Quiz"],
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", description: "Quiz title" },
        description: { type: "string", description: "Optional description" },
      },
    },
    response: {
      201: { description: "Quiz created", ...QuizResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuizController, "updateQuiz", [
  Schema({
    summary: "Update a quiz",
    description:
      "Updates an existing quiz by its UUID. Required header: `access-token`.",
    tags: ["Quiz"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Quiz UUID" },
      },
    },
    body: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    response: {
      200: { description: "Quiz updated", ...QuizResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuizController, "deleteQuiz", [
  Schema({
    summary: "Delete a quiz",
    description: "Deletes a quiz by its UUID. Required header: `access-token`.",
    tags: ["Quiz"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Quiz UUID" },
      },
    },
    response: {
      204: { description: "Quiz deleted", type: "null" },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Delete("/:id"),
]);

Controller("/quizzes")(QuizController);
