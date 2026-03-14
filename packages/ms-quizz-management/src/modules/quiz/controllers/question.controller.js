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
  CreateQuestionRequestDto,
  UpdateQuestionRequestDto,
} from "../contracts/question.dto.js";

export class QuestionController extends BaseController {
  /**
   * @param {import('../services/question.service.js').QuestionService} questionService
   */
  constructor(questionService) {
    super();
    this.questionService = questionService;
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getAllQuestions(_request, _reply) {
    return this.questionService.getAllQuestions();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getQuestionById(request, _reply) {
    return this.questionService.getQuestionById(request.params.id);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {quizId: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getQuestionsByQuizId(request, _reply) {
    return this.questionService.getQuestionsByQuizId(request.params.quizId);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/question.dto.js').CreateQuestionRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createQuestion(request, reply) {
    const { error } = CreateQuestionRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid question data: ${error.message}`);
    }
    const question = await this.questionService.createQuestion(request.body);
    return reply.code(201).send(question);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import('../contracts/question.dto.js').UpdateQuestionRequest}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async updateQuestion(request, _reply) {
    const { error } = UpdateQuestionRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(
        `Invalid question update data: ${error.message}`,
      );
    }
    return this.questionService.updateQuestion(
      request.params.id,
      new UpdateQuestionRequestDto(request.body),
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteQuestion(request, reply) {
    await this.questionService.deleteQuestion(request.params.id);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(QuestionController, "getAllQuestions", [
  Schema({
    description: "Get all questions. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
    response: {
      200: {
        type: "array",
        items: { $ref: "QuestionResponseDto#" },
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionById", [
  Schema({
    description: "Get a specific question by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { $ref: "QuestionResponseDto#" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionsByQuizId", [
  Schema({
    description:
      "Get all questions for a specific quiz. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
    params: {
      type: "object",
      properties: {
        quizId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "array",
        items: { $ref: "QuestionResponseDto#" },
      },
    },
  }),
  Get("/quiz/:quizId"),
]);

ApplyMethodDecorators(QuestionController, "createQuestion", [
  Schema({
    description: "Create a new question. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
    body: {
      type: "object",
      required: ["label", "type", "order_index", "timer_seconds", "quiz_id"],
      properties: {
        label: { type: "string" },
        type: { type: "string" },
        order_index: { type: "integer" },
        timer_seconds: { type: "integer" },
        quiz_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      201: { $ref: "QuestionResponseDto#" },
      400: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuestionController, "updateQuestion", [
  Schema({
    description: "Update an existing question. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
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
      200: { $ref: "QuestionResponseDto#" },
      400: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuestionController, "deleteQuestion", [
  Schema({
    description: "Delete a question by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Question"],
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

Controller("/questions")(QuestionController);
