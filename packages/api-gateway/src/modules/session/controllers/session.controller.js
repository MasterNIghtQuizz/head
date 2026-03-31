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
import { access } from "node:fs";

/** @type {Record<string, unknown>} */
const ErrorResponse = {
  type: "object",
  properties: { message: { type: "string" } },
};

/** @type {Record<string, unknown>} */
const CreateSessionResponse = {
  type: "object",
  properties: {
    session_id: { type: "string" },
    public_key: { type: "string" },
  },
};

export class SessionController extends BaseController {
  /**
   * @param {import("../services/session.service.js").SessionService} sessionService
   */
  constructor(sessionService) {
    super();
    this.sessionService = sessionService;
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Body: import("../services/session.service.js").CreateSessionRequest }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async createSession(request, reply) {
    const result = await this.sessionService.createSession(
      request.body,
      request.headers,
    );
    return reply.status(201).send(result);
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Params: { id: string } }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async getSession(request, reply) {
    const result = await this.sessionService.getSession(
      request.params.id,
      request.headers,
    );
    return reply.status(200).send(result);
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Params: { id: string } }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async startSession(request, reply) {
    await this.sessionService.startSession(request.params.id, request.headers);
    return reply.status(200).send();
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Params: { id: string } }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async endSession(request, reply) {
    await this.sessionService.endSession(request.params.id, request.headers);
    return reply.status(200).send();
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Params: { id: string } }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async deleteSession(request, reply) {
    await this.sessionService.deleteSession(request.params.id, request.headers);
    return reply.status(200).send();
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Params: { id: string } }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async nextQuestion(request, reply) {
    await this.sessionService.nextQuestion(request.params.id, request.headers);
    return reply.status(200).send();
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Body: import("../services/session.service.js").JoinSessionRequest }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async joinSession(request, reply) {
    const result = await this.sessionService.joinSession(
      request.body,
      request.headers,
    );
    return reply.status(200).send(result);
  }

  /**
   * @param {import("fastify").FastifyRequest<{ Body: import("../services/session.service.js").LeaveSessionRequest }>} request
   * @param {import("fastify").FastifyReply} reply
   */
  async leaveSession(request, reply) {
    await this.sessionService.leaveSession(request.body, request.headers);
    return reply.status(200).send();
  }
}

ApplyMethodDecorators(SessionController, "createSession", [
  Schema({
    tags: ["Session"],
    summary: "Create a new session",
    description: "Creates a new session for a given quiz and host.",
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      properties: {
        quiz_id: { type: "string" },
        host_id: { type: "string" },
      },
      required: ["quiz_id", "host_id"],
    },
    response: {
      201: CreateSessionResponse,
      400: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/"),
]);

ApplyMethodDecorators(SessionController, "getSession", [
  Schema({
    tags: ["Session"],
    summary: "Get session details",
    description: "Retrieves details of a session by its ID.",
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          session_id: { type: "string" },
          quiz_id: { type: "string" },
          host_id: { type: "string" },
          status: { type: "string" },
          current_question_index: { type: "number" },
          participants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                participant_id: { type: "string" },
                nickname: { type: "string" },
              },
            },
          },
        },
      },
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(SessionController, "startSession", [
  Schema({
    tags: ["Session"],
    summary: "Start a session",
    description:
      "Starts a session, allowing participants to join and answer questions.",
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: {
        description: "Session started successfully",
      },
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/:id/start"),
]);

ApplyMethodDecorators(SessionController, "endSession", [
  Schema({
    tags: ["Session"],
    summary: "End a session",
    description:
      "Ends a session, preventing participants from joining or answering questions.",
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: {
        description: "Session ended successfully",
      },
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/:id/end"),
]);

ApplyMethodDecorators(SessionController, "deleteSession", [
  Schema({
    tags: ["Session"],
    summary: "Delete a session",
    description: "Deletes a session permanently.",
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: {
        description: "Session deleted successfully",
      },
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Delete("/:id"),
]);

ApplyMethodDecorators(SessionController, "nextQuestion", [
  Schema({
    tags: ["Session"],
    summary: "Move to the next question",
    description:
      "Advances the session to the next question in the quiz, allowing participants to answer it.",
    security: [{ accessToken: [] }],
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    response: {
      200: {
        description: "Moved to the next question successfully",
      },
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/:id/next"),
]);

ApplyMethodDecorators(SessionController, "joinSession", [
  Schema({
    tags: ["Session", "Participant"],
    summary: "Join a session",
    description:
      "Allows a participant to join a session using the session's public key and their nickname.",
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      properties: {
        session_public_key: { type: "string" },
        participant_nickname: { type: "string" },
        participant_id: { type: "string" },
      },
      required: [
        "session_public_key",
        "participant_nickname",
        "participant_id",
      ],
    },
    response: {
      200: {
        description: "Participant joined the session successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                participant_id: { type: "string" },
              },
            },
          },
        },
      },
      400: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/join"),
]);

ApplyMethodDecorators(SessionController, "leaveSession", [
  Schema({
    tags: ["Session", "Participant"],
    summary: "Leave a session",
    description:
      "Allows a participant to leave a session they have joined using the session's public key and their participant ID.",
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      properties: {
        session_public_key: { type: "string" },
        participant_id: { type: "string" },
      },
      required: ["session_public_key", "participant_id"],
    },
    response: {
      200: {
        description: "Participant left the session successfully",
      },
      400: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Post("/leave"),
]);

Controller("/sessions")(SessionController);
