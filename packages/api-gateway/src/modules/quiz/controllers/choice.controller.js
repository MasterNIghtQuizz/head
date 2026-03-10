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

export class ChoiceController extends BaseController {
  /**
   * @param {import('../services/choice.service.js').ChoiceService} choiceService
   */
  constructor(choiceService) {
    super();
    this.choiceService = choiceService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   */
  async getAllChoices(request) {
    return this.choiceService.getAllChoices(request.headers);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   */
  async getChoiceById(request) {
    return this.choiceService.getChoiceById(request.params.id, request.headers);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {questionId: string}}>} request
   */
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
    description: "Get all choices",
    tags: ["Choice"],
  }),
  Get("/"),
]);

ApplyMethodDecorators(ChoiceController, "getChoiceById", [
  Schema({
    description: "Get choice by id",
    tags: ["Choice"],
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "getChoicesByQuestionId", [
  Schema({
    description: "Get choices by question id",
    tags: ["Choice"],
  }),
  Get("/question/:questionId"),
]);

ApplyMethodDecorators(ChoiceController, "createChoice", [
  Schema({
    description: "Create a new choice",
    tags: ["Choice"],
  }),
  Post("/"),
]);

ApplyMethodDecorators(ChoiceController, "updateChoice", [
  Schema({
    description: "Update a choice",
    tags: ["Choice"],
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(ChoiceController, "deleteChoice", [
  Schema({
    description: "Delete a choice",
    tags: ["Choice"],
  }),
  Delete("/:id"),
]);

Controller("/choices")(ChoiceController);
