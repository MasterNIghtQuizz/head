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

export class QuestionController extends BaseController {
  /**
   * @param {import('../services/question.service.js').QuestionService} questionService
   */
  constructor(questionService) {
    super();
    this.questionService = questionService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   */
  async getAllQuestions(request) {
    return this.questionService.getAllQuestions(request.headers);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   */
  async getQuestionById(request) {
    return this.questionService.getQuestionById(
      request.params.id,
      request.headers,
    );
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {quizId: string}}>} request
   */
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
    description: "Get all questions",
    tags: ["Question"],
  }),
  Get("/"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionById", [
  Schema({
    description: "Get question by id",
    tags: ["Question"],
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(QuestionController, "getQuestionsByQuizId", [
  Schema({
    description: "Get questions by quiz id",
    tags: ["Question"],
  }),
  Get("/quiz/:quizId"),
]);

ApplyMethodDecorators(QuestionController, "createQuestion", [
  Schema({
    description: "Create a new question",
    tags: ["Question"],
  }),
  Post("/"),
]);

ApplyMethodDecorators(QuestionController, "updateQuestion", [
  Schema({
    description: "Update a question",
    tags: ["Question"],
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(QuestionController, "deleteQuestion", [
  Schema({
    description: "Delete a question",
    tags: ["Question"],
  }),
  Delete("/:id"),
]);

Controller("/questions")(QuestionController);
