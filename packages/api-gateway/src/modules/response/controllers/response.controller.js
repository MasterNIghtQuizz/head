import {
  Controller,
  BaseController,
  Get,
  ApplyMethodDecorators,
  Schema,
  Roles,
  UseGameToken,
  Post,
  Delete,
} from "common-core";
import { UserRole } from "common-auth";
import { UnauthorizedError } from "common-errors";

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
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getSessionResponses(request, reply) {
    const { sessionId } = request.params;
    const responses = await this.responseService.getAllSessionResponses(
      sessionId,
      request.headers,
    );
    return reply.send(responses);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { participantId: string }, Querystring: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getParticipantResponses(request, reply) {
    const { participantId } = request.params;
    const { sessionId } = request.query;

    /** @type {import('common-auth').AccessTokenPayload | import('common-auth').GameTokenPayload | Omit<import('common-auth').InternalTokenPayload, 'source'> | undefined} */

    const authContext = request.user || request.gameTokenPayload;

    if (!authContext) {
      throw new UnauthorizedError("Unauthorized: Missing auth context");
    }

    const isAdmin =
      authContext.role === UserRole.ADMIN ||
      authContext.role === UserRole.MODERATOR;
    const isTargetParticipant = authContext.participantId === participantId;

    if (!isAdmin && !isTargetParticipant) {
      throw new UnauthorizedError(
        "You are not authorized to view these responses",
      );
    }

    const responses = await this.responseService.getAllParticipantResponses(
      participantId,
      sessionId,
      request.headers,
    );
    return reply.send(responses);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { questionId: string }, Querystring: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getQuestionResponses(request, reply) {
    const { questionId } = request.params;
    const { sessionId } = request.query;

    const responses = await this.responseService.getAllQuestionResponses(
      questionId,
      sessionId,
      request.headers,
    );
    return reply.send(responses);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: import('common-contracts').CreateResponseRequest }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async addResponse(request, reply) {
    const result = await this.responseService.addResponse(
      request.body,
      request.headers,
    );
    return reply.code(201).send(result);
  }

  /**

   * @param {import('fastify').FastifyRequest<{ Params: { quizzID: string }, Querystring: { hostId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async startSession(request, reply) {
    const { quizzID } = request.params;
    const { hostId } = request.query;
    const result = await this.responseService.startSession(
      quizzID,
      hostId,
      request.headers,
    );
    return reply.send(result);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async endSession(request, reply) {
    const { sessionId } = request.params;
    await this.responseService.endSession(sessionId, request.headers);
    return reply.code(204).send();
  }
  /**
   * @param {import('fastify').FastifyRequest<{ Params: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getLeaderboard(request, reply) {
    const { sessionId } = request.params;
    const leaderboard = await this.responseService.getLeaderboard(
      sessionId,
      request.headers,
    );
    return reply.send(leaderboard);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Params: { questionId: string }, Querystring: { sessionId: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getQuestionStats(request, reply) {
    const { questionId } = request.params;
    const { sessionId } = request.query;
    const stats = await this.responseService.getQuestionStats(
      questionId,
      sessionId,
      request.headers,
    );
    return reply.send(stats);
  }
}
const ErrorResponse = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

ApplyMethodDecorators(ResponseController, "getLeaderboard", [
  Schema({
    description: "Get the leaderboard for a session (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
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
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Get("/leaderboard/session/:sessionId"),
]);

ApplyMethodDecorators(ResponseController, "getQuestionStats", [
  Schema({
    description:
      "Get statistics for a specific question (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
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
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Get("/stats/question/:questionId"),
]);

ApplyMethodDecorators(ResponseController, "getSessionResponses", [
  Schema({
    description: "Get all responses for a session (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
    params: {
      type: "object",
      required: ["sessionId"],
      properties: {
        sessionId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: { type: "array", items: { type: "object" } },
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Get("/session/:sessionId"),
]);

ApplyMethodDecorators(ResponseController, "getParticipantResponses", [
  Schema({
    description:
      "Get all responses for a participant. Users can only see their own responses.",
    tags: ["Response"],
    security: [{ gameToken: [] }],
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
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER]),
  Get("/participant/:participantId"),
]);

ApplyMethodDecorators(ResponseController, "getQuestionResponses", [
  Schema({
    description: "Get all responses for a question (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
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
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Get("/question/:questionId"),
]);

ApplyMethodDecorators(ResponseController, "addResponse", [
  Schema({
    description: "Submit a response to a question (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
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
        properties: { id: { type: "string" }, message: { type: "string" } },
      },
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/response"),
]);

ApplyMethodDecorators(ResponseController, "startSession", [
  Schema({
    description: "Start a session in ms-response (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
    params: {
      type: "object",
      required: ["quizzID"],
      properties: { quizzID: { type: "string" } },
    },
    querystring: {
      type: "object",
      required: ["hostId"],
      properties: { hostId: { type: "string", format: "uuid" } },
    },
    response: {
      200: { type: "object" },
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/session/start/:quizzID"),
]);

ApplyMethodDecorators(ResponseController, "endSession", [
  Schema({
    description: "End a session in ms-response (Admin/Moderator only)",
    tags: ["Response"],
    security: [{ gameToken: [] }],
    params: {
      type: "object",
      required: ["sessionId"],
      properties: { sessionId: { type: "string", format: "uuid" } },
    },
    response: {
      204: { type: "null" },
      401: ErrorResponse,
      403: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Delete("/session/end/:sessionId"),
]);

Controller("/responses")(ResponseController);
