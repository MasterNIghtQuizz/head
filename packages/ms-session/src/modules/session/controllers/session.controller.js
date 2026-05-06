import {
  Controller,
  BaseController,
  Get,
  Post,
  Delete,
  ApplyMethodDecorators,
  Schema,
} from "common-core";
import { CreateSessionRequestDto } from "../contracts/session.dto.js";
import { UnauthorizedError } from "common-errors";
import logger from "common-logger";

export class SessionController extends BaseController {
  /** @type {import('../services/session.service.js').SessionService} */
  sessionService;

  /**
   * @param {import('../services/session.service.js').SessionService} sessionService
   */
  constructor(sessionService) {
    super();
    this.sessionService = sessionService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @returns {import('common-auth').InternalTokenPayload}
   */
  _getInternalPayload(request) {
    const payload = request.internalTokenPayload;
    if (!payload) {
      throw new UnauthorizedError("Unauthorized: Missing auth context");
    }
    return payload;
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: import('../contracts/session.dto.js').CreateSessionRequestDto }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createSession(request, reply) {
    const { error } = CreateSessionRequestDto.validate(request.body);
    if (error) {
      return reply.code(400).send({ message: error.details[0].message });
    }
    const session = await this.sessionService.createSession(
      request.body,
      request.headers,
    );
    return reply.code(201).send(session);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getSession(request, reply) {
    const payload = this._getInternalPayload(request);
    logger.info({ payload }, "Generated internal token payload");
    const { sessionId, participantId } = payload;
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    const session = await this.sessionService.getSession(
      sessionId,
      participantId || "",
      request.headers,
    );

    return reply.code(200).send(session);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async startSession(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    await this.sessionService.startSession(sessionId, request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async endSession(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    await this.sessionService.endSession(sessionId);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteSession(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    await this.sessionService.deleteSession(sessionId);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async nextQuestion(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    await this.sessionService.nextQuestion(sessionId, request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getCurrentQuestion(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    const question = await this.sessionService.getCurrentQuestion(
      sessionId,
      request.headers,
    );
    return reply.code(200).send(question);
  }
}

ApplyMethodDecorators(SessionController, "createSession", [
  Schema({
    description: "Internal route to create a session.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    body: {
      type: "object",
      required: ["quiz_id"],
      properties: {
        quiz_id: { type: "string" },
      },
    },
    response: {
      201: {
        description: "Session successfully created.",
        type: "object",
        properties: {
          session_id: { type: "string" },
          public_key: { type: "string" },
          game_token: { type: "string" },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
      401: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(SessionController, "getSession", [
  Schema({
    description:
      "Internal route to get session details by ID from token payload.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: {
        description: "Session details retrieved successfully.",
        type: "object",
        properties: {
          session_id: { type: "string" },
          status: { type: "string" },
          current_question_id: { type: "string", nullable: true },
          quizz_id: { type: "string" },
          public_key: { type: "string" },
          host_id: { type: "string" },
          participants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                participant_id: { type: "string" },
                nickname: { type: "string" },
                role: { type: "string" },
              },
            },
          },
          activated_at: { type: "integer", nullable: true },
          has_answered: { type: "boolean" },
        },
      },

      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(SessionController, "startSession", [
  Schema({
    description: "Internal route to start a session.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Session successfully started." },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      409: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/start/"),
]);

ApplyMethodDecorators(SessionController, "nextQuestion", [
  Schema({
    description: "Internal route to advance to the next question.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Successfully moved to the next question." },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/next/"),
]);

ApplyMethodDecorators(SessionController, "endSession", [
  Schema({
    description: "Internal route to end a session.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Session successfully ended." },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/end/"),
]);

ApplyMethodDecorators(SessionController, "deleteSession", [
  Schema({
    description: "Internal route to delete a session.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Session successfully deleted." },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Delete("/"),
]);

ApplyMethodDecorators(SessionController, "getCurrentQuestion", [
  Schema({
    description: "Internal route to get the current question details.",
    tags: ["Session"],
    security: [{ internalToken: [] }],
    response: {
      200: {
        description: "Successfully retrieved current question details.",
        type: "object",
        nullable: true,
        properties: {
          question_id: { type: "string" },
          label: { type: "string" },
          type: { type: "string" },
          timer_seconds: { type: "number" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
            },
          },
          current_buzzer: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              username: { type: "string" },
              pressed_at: { type: "string" },
            },
          },
        },
      },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/current-question/"),
]);

Controller("/sessions")(SessionController);
