import {
  Controller,
  BaseController,
  Get,
  Post,
  ApplyMethodDecorators,
  Schema,
} from "common-core";
import {
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";
import { CreateSessionRequestDto } from "../contracts/session.dto.js";

export class SessionController extends BaseController {
  /**
   * @param {import('../services/session.service.js').SessionService} sessionService
   */
  constructor(sessionService) {
    super();
    this.sessionService = sessionService;
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/session.dto.js').CreateSessionRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('../contracts/session.dto.js').CreateSessionResponse>}
   */
  async createSession(request, reply) {
    const { error } = CreateSessionRequestDto.validate(request.body);
    if (error) {
      return reply.code(400).send({ message: error.details[0].message });
    }
    const session = await this.sessionService.createSession(request.body);
    return reply.code(201).send(session);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('../contracts/session.dto.js').GetSessionResponse>}
   */
  async getSession(request, reply) {
    const session = await this.sessionService.getSession(request.params.id);
    return reply.code(200).send(session);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async startSession(request, reply) {
    try {
      await this.sessionService.startSession(request.params.id);
    } catch (error) {
      if (error instanceof SESSION_NOT_FOUND) {
        return reply.code(404).send({ message: error });
      }
    }
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async endSession(request, reply) {
    try {
      await this.sessionService.endSession(request.params.id);
    } catch (error) {
      if (error instanceof SESSION_NOT_FOUND) {
        return reply.code(404).send({ message: error });
      }
    }
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async nextQuestion(request, reply) {
    try {
      await this.sessionService.nextQuestion(request.params.id);
    } catch (error) {
      if (error instanceof SESSION_NOT_FOUND) {
        return reply.code(404).send({ message: error });
      } else if (error instanceof SESSION_INVALID_STATUS) {
        return reply.code(400).send({ message: error });
      }
    }
    return reply.code(200).send();
  }
}

ApplyMethodDecorators(SessionController, "createSession", [
  Schema({
    description: "Create a new session",
    tags: ["Session"],
    params: {},
    body: {
      type: "object",
      properties: {
        quiz_id: { type: "string" },
        host_id: { type: "string" },
      },
      required: ["quiz_id", "host_id"],
    },
    response: {
      201: {
        description: "Session created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                session_id: { type: "string" },
                public_key: { type: "string" },
              },
            },
          },
        },
      },
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(SessionController, "getSession", [
  Schema({
    description: "Get a session by id",
    tags: ["Session"],
    params: {
      id: { type: "string", description: "Session id" },
    },
    response: {
      200: {
        description: "Session retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                session_id: { type: "string" },
                public_key: { type: "string" },
                status: { type: "string" },
                current_question_id: { type: "string" },
                quizz_id: { type: "string" },
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
              },
            },
          },
        },
      },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(SessionController, "startSession", [
  Schema({
    description: "Start a session",
    tags: ["Session"],
    params: {
      id: { type: "string", description: "Session id" },
    },
    response: {
      200: {
        description: "Session started successfully",
      },
      404: {
        description: "Session not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  }),
  Post("/:id/start"),
]);

ApplyMethodDecorators(SessionController, "endSession", [
  Schema({
    description: "End a session",
    tags: ["Session"],
    params: {
      id: { type: "string", description: "Session id" },
    },
    response: {
      200: {
        description: "Session ended successfully",
      },
      404: {
        description: "Session not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  }),
  Post("/:id/end"),
]);

ApplyMethodDecorators(SessionController, "nextQuestion", [
  Schema({
    description: "Go to the next question of a session",
    tags: ["Session"],
    params: {
      id: { type: "string", description: "Session id" },
    },
    response: {
      200: {
        description: "Next question activated successfully",
      },
      400: {
        description:
          "Session is not in a valid status to go to the next question",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
      404: {
        description: "Session not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  }),
  Post("/:id/next-question"),
]);

Controller("/sessions")(SessionController);
