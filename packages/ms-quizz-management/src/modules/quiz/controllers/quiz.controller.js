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
  CreateQuizRequestDto,
  UpdateQuizRequestDto,
  GetQuizRequestDto,
} from "../contracts/quiz.dto.js";

export class QuizController extends BaseController {
  /**
   * @param {import('../services/quiz.service.js').QuizService} quizService
   */
  constructor(quizService) {
    super();
    this.quizService = quizService;
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getAllQuizzes(_request, _reply) {
    return this.quizService.getAllQuizzes();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getQuizById(request, _reply) {
    return this.quizService.getQuizById(request.params.id);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/quiz.dto.js').CreateQuizRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createQuiz(request, reply) {
    const { error } = CreateQuizRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid quiz data: ${error.message}`);
    }
    const quiz = await this.quizService.createQuiz(
      new CreateQuizRequestDto(request.body),
    );
    return reply.code(201).send(quiz);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import('../contracts/quiz.dto.js').UpdateQuizRequest}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async updateQuiz(request, _reply) {
    const { error } = UpdateQuizRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid quiz update data: ${error.message}`);
    }
    return this.quizService.updateQuiz(
      request.params.id,
      new UpdateQuizRequestDto(request.body),
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteQuiz(request, reply) {
    await this.quizService.deleteQuiz(request.params.id);
    return reply.code(204).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getQuizAnswers(request, _reply) {
    return this.quizService.getQuizAnswers(request.params.id);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/quiz.dto.js').GetQuizRequest}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getFullQuiz(request, _reply) {
    const { error } = GetQuizRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid quiz request: ${error.message}`);
    }
    return this.quizService.getFullQuiz(request.body.quizId);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/quiz.dto.js').GetQuizRequest}>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async getQuizIdsOnly(request, _reply) {
    const { error } = GetQuizRequestDto.validate(request.body);
    if (error) {
      throw new BadRequestError(`Invalid quiz request: ${error.message}`);
    }
    return this.quizService.getQuizIdsOnly(request.body.quizId);
  }
}

ApplyMethodDecorators(QuizController, "getFullQuiz", [
  Schema({
    description: "Get a full quiz by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    body: {
      type: "object",
      required: ["quizId"],
      properties: { quizId: { type: "string", format: "uuid" } },
    },
    response: {
      200: { $ref: "FullQuizResponseDto#" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/get-full"),
]);

ApplyMethodDecorators(QuizController, "getQuizIdsOnly", [
  Schema({
    description: "Get only IDs of a quiz. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    body: {
      type: "object",
      required: ["quizId"],
      properties: { quizId: { type: "string", format: "uuid" } },
    },
    response: {
      200: { $ref: "QuizIdsResponseDto#" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/get-ids"),
]);

ApplyMethodDecorators(QuizController, "getQuizAnswers", [
  Schema({
    description:
      "Get all correct answers for a quiz. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { $ref: "QuizAnswersResponseDto#" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/:id/answers"),
]);

ApplyMethodDecorators(QuizController, "getAllQuizzes", [
  Schema({
    description: "Get all quizzes. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuizController, "getQuizById", [
  Schema({
    description: "Get a specific quiz by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuizController, "createQuiz", [
  Schema({
    description: "Create a new quiz. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    body: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuizController, "updateQuiz", [
  Schema({
    description: "Update an existing quiz. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
    params: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
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
      200: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuizController, "deleteQuiz", [
  Schema({
    description: "Delete a quiz by ID. Roles: USER, ACCESS, INTERNAL",
    tags: ["Quiz"],
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

Controller("/quizzes")(QuizController);
