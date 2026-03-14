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
const QuestionResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    label: { type: "string" },
    type: { type: "string" },
    order_index: { type: "integer" },
    timer_seconds: { type: "integer" },
    quiz_id: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export class QuestionController extends BaseController {
  /**
   * @param {import('../services/question.service.js').QuestionService} questionService
   */
  constructor(questionService) {
    super();
    this.questionService = questionService;
  }

  /** @param {import('fastify').FastifyRequest} request */
  async getAllQuestions(request) {
    return this.questionService.getAllQuestions(request.headers);
  }

  /** @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request */
  async getQuestionById(request) {
    return this.questionService.getQuestionById(
      request.params.id,
      request.headers,
    );
  }

  /** @param {import('fastify').FastifyRequest<{Params: {quizId: string}}>} request */
  async getQuestionsByQuizId(request) {
    return this.questionService.getQuestionsByQuizId(
      request.params.quizId,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import("../services/question.service.js").CreateQuestionRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createQuestion(request, reply) {
    const result = await this.questionService.createQuestion(
      request.body,
      request.headers,
    );
    return reply.code(201).send(result);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import("../services/question.service.js").UpdateQuestionRequest}>} request
   */
  async updateQuestion(request) {
    return this.questionService.updateQuestion(
      request.params.id,
      request.body,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteQuestion(request, reply) {
    await this.questionService.deleteQuestion(
      request.params.id,
      request.headers,
    );
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(QuestionController, "getAllQuestions", [
  Schema({
    summary: "List all questions",
    description:
      "Returns all questions across every quiz. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    response: {
      200: {
        description: "List of questions",
        type: "array",
        items: QuestionResponse,
      },
      401: { description: "Unauthorized", ...ErrorResponse },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionById", [
  Schema({
    summary: "Get a question by ID",
    description:
      "Returns a single question by its UUID. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Question UUID" },
      },
    },
    response: {
      200: { description: "Question found", ...QuestionResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionsByQuizId", [
  Schema({
    summary: "Get questions by quiz",
    description:
      "Returns all questions belonging to a specific quiz. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["quizId"],
      properties: {
        quizId: {
          type: "string",
          format: "uuid",
          description: "Parent quiz UUID",
        },
      },
    },
    response: {
      200: {
        description: "List of questions for the quiz",
        type: "array",
        items: QuestionResponse,
      },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Get("/quiz/:quizId"),
]);

ApplyMethodDecorators(QuestionController, "createQuestion", [
  Schema({
    summary: "Create a question",
    description:
      "Creates a new question linked to a quiz. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      required: ["label", "type", "order_index", "timer_seconds", "quiz_id"],
      properties: {
        label: { type: "string", description: "Question text" },
        type: {
          type: "string",
          description: "Question type (e.g. multiple, single)",
        },
        order_index: {
          type: "integer",
          description: "Display order within the quiz",
        },
        timer_seconds: {
          type: "integer",
          description: "Time allowed to answer in seconds",
        },
        quiz_id: {
          type: "string",
          format: "uuid",
          description: "Parent quiz UUID",
        },
      },
    },
    response: {
      201: { description: "Question created", ...QuestionResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuestionController, "updateQuestion", [
  Schema({
    summary: "Update a question",
    description:
      "Updates an existing question by its UUID. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Question UUID" },
      },
    },
    body: {
      type: "object",
      properties: {
        label: { type: "string" },
        type: { type: "string" },
        order_index: { type: "integer" },
        timer_seconds: { type: "integer" },
      },
    },
    response: {
      200: { description: "Question updated", ...QuestionResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuestionController, "deleteQuestion", [
  Schema({
    summary: "Delete a question",
    description:
      "Deletes a question by its UUID. Required header: `access-token`.",
    tags: ["Question"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Question UUID" },
      },
    },
    response: {
      204: { description: "Question deleted", type: "null" },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Delete("/:id"),
]);

Controller("/questions")(QuestionController);
