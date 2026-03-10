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
import { BadRequestError } from "common-errors";
import {
  CreateChoiceRequestDto,
  UpdateChoiceRequestDto,
} from "../contracts/choice.dto.js";

export class ChoiceController extends BaseController {
  /**
   * @param {import('../services/choice.service.js').ChoiceService} choiceService
   */
  constructor(choiceService) {
    super();
    this.choiceService = choiceService;
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getAllChoices(_request, _reply) {
    return this.choiceService.getAllChoices();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getChoiceById(request, _reply) {
    return this.choiceService.getChoiceById(request.params.id);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {questionId: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getChoicesByQuestionId(request, _reply) {
    return this.choiceService.getChoicesByQuestionId(request.params.questionId);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/choice.dto.js').CreateChoiceRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createChoice(request, reply) {
    const { error } = CreateChoiceRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid choice data: ${error.message}`);
    }
    const choice = await this.choiceService.createChoice(request.body);
    return reply.code(201).send(choice);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import('../contracts/choice.dto.js').UpdateChoiceRequest}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async updateChoice(request, _reply) {
    const { error } = UpdateChoiceRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid choice update data: ${error.message}`);
    }
    return this.choiceService.updateChoice(
      request.params.id,
      new UpdateChoiceRequestDto(request.body),
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteChoice(request, reply) {
    await this.choiceService.deleteChoice(request.params.id);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(ChoiceController, "getAllChoices", [
  Schema({
    description: "Get all choices. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    response: {
      200: {
        type: "array",
        items: { $ref: "ChoiceResponseDto#" },
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(ChoiceController, "getChoiceById", [
  Schema({
    description: "Get a specific choice by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { $ref: "ChoiceResponseDto#" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "getChoicesByQuestionId", [
  Schema({
    description:
      "Get all choices for a specific question. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    params: {
      type: "object",
      properties: {
        questionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "array",
        items: { $ref: "ChoiceResponseDto#" },
      },
    },
  }),
  Get("/question/:questionId"),
]);

ApplyMethodDecorators(ChoiceController, "createChoice", [
  Schema({
    description: "Create a new choice. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    body: {
      type: "object",
      required: ["text", "is_correct", "question_id"],
      properties: {
        text: { type: "string" },
        is_correct: { type: "boolean" },
        question_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      201: { $ref: "ChoiceResponseDto#" },
      400: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(ChoiceController, "updateChoice", [
  Schema({
    description: "Update an existing choice. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
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
      200: { $ref: "ChoiceResponseDto#" },
      400: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "deleteChoice", [
  Schema({
    description: "Delete a choice by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Choice"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
    response: {
      204: { type: "null" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Delete("/:id"),
]);

Controller("/choices")(ChoiceController);
