import {
  Controller,
  BaseController,
  Get,
  Post,
  Delete,
  ApplyMethodDecorators,
  Schema,
} from "common-core";
import { CreateResponseRequestDto } from "../contracts/response.dto.js";
import logger from "../../../logger.js";
import {
  ResponseErrorStatus,
  ResponseErrorMessage,
} from "../response.constants.js";

export class ResponseController extends BaseController {
  /** @type {import('../services/response.service.js').ResponseService} */
  responseService;

  /**
   * @param {import('../services/response.service.js').ResponseService} responseService
   */
  constructor(responseService) {
    super();
    this.responseService = responseService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async addResponse(request, reply) {
    const { error, value } = CreateResponseRequestDto.validate(request.body);

    if (error) {
      return reply.code(400).send({ message: error.message });
    }

    try {
      const result = await this.responseService.handleAnswer(
        /** @type {import('common-contracts').AnswerEvent} */ (value),
      );

      return reply.code(201).send({
        id: result.id,
        message: "Response submitted successfully",
      });
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      const status = ResponseErrorStatus[caught.message] ?? 500;
      const message =
        ResponseErrorMessage[caught.message] ?? ResponseErrorMessage.DEFAULT;

      if (status >= 500) {
        logger.error(
          { error: caught.message },
          "Unexpected error during answer submission",
        );
      }

      return reply.code(status).send({ message });
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async endSession(request, reply) {
    const { sessionId } = request.params;

    try {
      await this.responseService.clearSession(sessionId);
      return reply.code(204).send();
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      logger.error(
        { sessionId, error: caught.message },
        "Failed to clear session",
      );
      return reply.code(500).send({ message: ResponseErrorMessage.DEFAULT });
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { quizzID: string }, Querystring: { hostId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async startSession(request, reply) {
    const { quizzID } = request.params;
    const hostId = request.user?.userId || request.query.hostId;

    if (!hostId) {
      return reply.code(400).send({ message: "Host ID is required" });
    }

    logger.info({ quizzID, hostId }, "Fetching quiz data for session");

    try {
      const quiz = await this.responseService.fetchQuizz(
        quizzID,
        /** @type {string} */ (hostId),

        request.headers,
      );
      return reply.send(quiz);
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      const status = ResponseErrorStatus[caught.message] ?? 500;
      const message =
        ResponseErrorMessage[caught.message] ?? ResponseErrorMessage.DEFAULT;

      logger.error({ quizzID, error: caught.message }, "Failed to fetch quiz");
      return reply.code(status).send({ message });
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getAllSessionResponses(request, reply) {
    const { sessionId } = request.params;

    try {
      const responses =
        await this.responseService.getAllSessionResponses(sessionId);
      return reply.send(responses);
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      logger.error(
        { sessionId, error: caught.message },
        "Failed to fetch session responses",
      );
      return reply.code(500).send({ message: ResponseErrorMessage.DEFAULT });
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { participantId: string }, Querystring: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getAllParticipantResponses(request, reply) {
    const { participantId } = request.params;
    const { sessionId } = request.query;

    try {
      const responses = await this.responseService.getResponsesByParticipant(
        participantId,
        sessionId,
      );
      return reply.send(responses);
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      logger.error(
        { participantId, sessionId, error: caught.message },
        "Failed to fetch participant responses",
      );
      return reply.code(500).send({ message: ResponseErrorMessage.DEFAULT });
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { questionId: string }, Querystring: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getAllQuestionResponses(request, reply) {
    const { questionId } = request.params;
    const { sessionId } = request.query;

    try {
      const responses = await this.responseService.getResponsesByQuestion(
        questionId,
        sessionId,
      );
      return reply.send(responses);
    } catch (err) {
      const caught = /** @type {Error} */ (err);
      logger.error(
        { questionId, sessionId, error: caught.message },
        "Failed to fetch question responses",
      );
      return reply.code(500).send({ message: ResponseErrorMessage.DEFAULT });
    }
  }
  /**
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getLeaderboard(request, reply) {
    const { sessionId } = request.params;
    const result = await this.responseService.getLeaderboard(sessionId);
    return reply.send(result);
  }
}

ApplyMethodDecorators(ResponseController, "getLeaderboard", [
  Schema({
    description: "Get the leaderboard for a session",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["sessionId"],
      properties: { sessionId: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            participantId: { type: "string" },
            score: { type: "number" },
          },
        },
      },
    },
  }),
  Get("/leaderboard/session/:sessionId"),
]);

/**
 * @param {import('fastify').FastifyRequest<{ Params: { questionId: string }, Querystring: { sessionId: string } }>} request
 * @param {import('fastify').FastifyReply} reply
 */
async function getQuestionStats(request, reply) {
  const { questionId } = request.params;
  const { sessionId } = request.query;
  // @ts-ignore
  const result = await this.responseService.getQuestionStats(
    questionId,
    sessionId,
  );
  return reply.send(result);
}

// @ts-ignore
ResponseController.prototype.getQuestionStats = getQuestionStats;

ApplyMethodDecorators(ResponseController, "getQuestionStats", [
  Schema({
    description: "Get statistics for a specific question",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["questionId"],
      properties: { questionId: { type: "string", format: "uuid" } },
    },
    querystring: {
      type: "object",
      required: ["sessionId"],
      properties: { sessionId: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            choiceId: { type: "string" },
            count: { type: "number" },
          },
        },
      },
    },
  }),
  Get("/stats/question/:questionId"),
]);

ApplyMethodDecorators(ResponseController, "addResponse", [
  Schema({
    description: "Submit a response to a question",
    tags: ["Response"],
    body: {
      type: "object",
      required: ["participantId", "questionId", "sessionId", "latencyMs"],
      properties: {
        participantId: { type: "string", format: "uuid" },
        questionId: { type: "string", format: "uuid" },
        sessionId: { type: "string", format: "uuid" },
        latencyMs: { type: "integer", minimum: 0 },
        choiceId: { type: "string", format: "uuid" },
        isCorrect: { type: "boolean" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "string" },
          message: { type: "string" },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
      409: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/response"),
]);

ApplyMethodDecorators(ResponseController, "endSession", [
  Schema({
    description: "End a session and clear all its responses",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      204: { type: "null" },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Delete("/session/end/:sessionId"),
]);

ApplyMethodDecorators(ResponseController, "startSession", [
  Schema({
    description: "Fetch and cache quiz data for a session",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["quizzID"],
      properties: {
        quizzID: { type: "string" },
      },
    },
    querystring: {
      type: "object",
      required: ["hostId"],
      properties: {
        hostId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { type: "object" },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/session/start/:quizzID"),
]);

ApplyMethodDecorators(ResponseController, "getAllSessionResponses", [
  Schema({
    description: "Get all responses for a session",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { type: "array", items: { type: "object" } },
    },
  }),
  Get("/session/:sessionId"),
]);

ApplyMethodDecorators(ResponseController, "getAllParticipantResponses", [
  Schema({
    description: "Get all responses for a specific participant in a session",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["participantId"],
      properties: {
        participantId: { type: "string", format: "uuid" },
      },
    },
    querystring: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { type: "array", items: { type: "object" } },
    },
  }),
  Get("/participant/:participantId"),
]);

ApplyMethodDecorators(ResponseController, "getAllQuestionResponses", [
  Schema({
    description: "Get all responses for a specific question in a session",
    tags: ["Response"],
    params: {
      type: "object",
      required: ["questionId"],
      properties: {
        questionId: { type: "string", format: "uuid" },
      },
    },
    querystring: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { type: "array", items: { type: "object" } },
    },
  }),
  Get("/question/:questionId"),
]);

Controller("/responses")(ResponseController);
