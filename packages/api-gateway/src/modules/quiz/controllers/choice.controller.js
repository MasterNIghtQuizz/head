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
const ChoiceResponse = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    text: { type: "string" },
    is_correct: { type: "boolean" },
    question_id: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export class ChoiceController extends BaseController {
  /**
   * @param {import('../services/choice.service.js').ChoiceService} choiceService
   */
  constructor(choiceService) {
    super();
    this.choiceService = choiceService;
  }

  /** @param {import('fastify').FastifyRequest} request */
  async getAllChoices(request) {
    return this.choiceService.getAllChoices(request.headers);
  }

  /** @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request */
  async getChoiceById(request) {
    return this.choiceService.getChoiceById(request.params.id, request.headers);
  }

  /** @param {import('fastify').FastifyRequest<{Params: {questionId: string}}>} request */
  async getChoicesByQuestionId(request) {
    return this.choiceService.getChoicesByQuestionId(
      request.params.questionId,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import("../services/choice.service.js").CreateChoiceRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createChoice(request, reply) {
    const result = await this.choiceService.createChoice(
      request.body,
      request.headers,
    );
    return reply.code(201).send(result);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import("../services/choice.service.js").UpdateChoiceRequest}>} request
   */
  async updateChoice(request) {
    return this.choiceService.updateChoice(
      request.params.id,
      request.body,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteChoice(request, reply) {
    await this.choiceService.deleteChoice(request.params.id, request.headers);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(ChoiceController, "getAllChoices", [
  Schema({
    summary: "List all choices",
    description:
      "Returns all choices across every question. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    response: {
      200: {
        description: "List of choices",
        type: "array",
        items: ChoiceResponse,
      },
      401: { description: "Unauthorized", ...ErrorResponse },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(ChoiceController, "getChoiceById", [
  Schema({
    summary: "Get a choice by ID",
    description:
      "Returns a single choice by its UUID. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Choice UUID" },
      },
    },
    response: {
      200: { description: "Choice found", ...ChoiceResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "getChoicesByQuestionId", [
  Schema({
    summary: "Get choices by question",
    description:
      "Returns all choices for a specific question. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["questionId"],
      properties: {
        questionId: {
          type: "string",
          format: "uuid",
          description: "Parent question UUID",
        },
      },
    },
    response: {
      200: {
        description: "List of choices for the question",
        type: "array",
        items: ChoiceResponse,
      },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Get("/question/:questionId"),
]);

ApplyMethodDecorators(ChoiceController, "createChoice", [
  Schema({
    summary: "Create a choice",
    description:
      "Creates a new choice linked to a question. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      required: ["text", "is_correct", "question_id"],
      properties: {
        text: { type: "string", description: "Choice text" },
        is_correct: {
          type: "boolean",
          description: "Whether this choice is the correct answer",
        },
        question_id: {
          type: "string",
          format: "uuid",
          description: "Parent question UUID",
        },
      },
    },
    response: {
      201: { description: "Choice created", ...ChoiceResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(ChoiceController, "updateChoice", [
  Schema({
    summary: "Update a choice",
    description:
      "Updates an existing choice by its UUID. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Choice UUID" },
      },
    },
    body: {
      type: "object",
      properties: {
        text: { type: "string" },
        is_correct: { type: "boolean" },
      },
    },
    response: {
      200: { description: "Choice updated", ...ChoiceResponse },
      400: { description: "Bad Request — invalid payload", ...ErrorResponse },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "deleteChoice", [
  Schema({
    summary: "Delete a choice",
    description:
      "Deletes a choice by its UUID. Required header: `access-token`.",
    tags: ["Choice"],
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid", description: "Choice UUID" },
      },
    },
    response: {
      204: { description: "Choice deleted", type: "null" },
      401: { description: "Unauthorized", ...ErrorResponse },
      404: { description: "Not Found", ...ErrorResponse },
    },
  }),
  Delete("/:id"),
]);

Controller("/choices")(ChoiceController);
