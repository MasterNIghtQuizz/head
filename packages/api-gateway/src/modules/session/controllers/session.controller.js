import {
  Controller,
  BaseController,
  Get,
  Post,
  Delete,
  ApplyMethodDecorators,
  Schema,
  Roles,
  Public,
  UseGameToken,
} from "common-core";
import { UserRole } from "common-auth";

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
   * @param {import('fastify').FastifyRequest<{ Body: { quiz_id: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createSession(request, reply) {
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
    const session = await this.sessionService.getSession(request.headers);
    return reply.code(200).send(session);
  }


  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async startSession(request, reply) {
    await this.sessionService.startSession(request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async endSession(request, reply) {
    await this.sessionService.endSession(request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteSession(request, reply) {
    await this.sessionService.deleteSession(request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async nextQuestion(request, reply) {
    await this.sessionService.nextQuestion(request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { session_public_key: string; participant_nickname: string } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async joinSession(request, reply) {
    const response = await this.sessionService.joinSession(
      request.body,
      request.headers,
    );
    return reply.code(200).send(response);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async leaveSession(request, reply) {
    await this.sessionService.leaveSession(request.headers);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getCurrentQuestion(request, reply) {
    const question = await this.sessionService.getCurrentQuestion(
      request.headers,
    );
    return reply.code(200).send(question);
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { choiceIds: string[] } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async submitResponse(request, reply) {
    await this.sessionService.submitResponse(
      request.body.choiceIds,
      request.headers,
    );
    return reply.code(206).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { participantId: string, isCorrect: boolean } }>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async answerBuzzer(request, reply) {
    await this.sessionService.answerBuzzer(
      request.body.participantId,
      request.body.isCorrect,
      request.headers,
    );
    return reply.code(200).send({ message: "Buzzer answer processed" });
  }
}

const ErrorResponse = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

ApplyMethodDecorators(SessionController, "createSession", [
  Schema({
    description:
      "Create a new quiz session and returns a moderator game token.",
    tags: ["Session"],
    security: [{ accessToken: [] }],
    body: {
      type: "object",
      required: ["quiz_id"],
      properties: {
        quiz_id: {
          type: "string",
          description:
            "The unique identifier of the quiz to use for this session.",
        },
      },
    },
    response: {
      201: {
        description: "Session successfully created.",
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "The internal ID of the created session.",
          },
          public_key: {
            type: "string",
            description:
              "The 6-character public key used by participants to join.",
          },
          game_token: {
            type: "string",
            description:
              "A JWT token granting moderator rights for this session.",
          },
        },
      },
      400: ErrorResponse,
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER]),
  Post("/"),
]);

ApplyMethodDecorators(SessionController, "getSession", [
  Schema({
    description:
      "Retrieve complete details for the session associated with the provided game token.",
    tags: ["Session"],
    security: [{ gameToken: [] }],
    response: {
      200: {
        description: "Session details retrieved successfully.",
        type: "object",
        properties: {
          session_id: { type: "string", description: "Session identifier." },
          status: {
            type: "string",
            enum: [
              "CREATED",
              "LOBBY",
              "QUESTION_ACTIVE",
              "QUESTION_CLOSED",
              "FINISHED",
            ],
            description: "Current lifecycle state of the session.",
          },
          current_question_id: {
            type: "string",
            nullable: true,
            description: "ID of the currently active question, if any.",
          },
          quizz_id: {
            type: "string",
            description: "ID of the quiz being played.",
          },
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
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Get("/"),
]);


ApplyMethodDecorators(SessionController, "startSession", [
  Schema({
    description:
      "Transition a session from LOBBY to active state. Requires moderator role.",
    tags: ["Session"],
    security: [{ gameToken: [] }],

    response: {
      200: {
        description: "Session successfully started.",
        type: "object",
        properties: { message: { type: "string", example: "Session started" } },
      },
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      409: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/start/"),
]);

ApplyMethodDecorators(SessionController, "endSession", [
  Schema({
    description: "Immediately terminate the session. Requires moderator role.",
    tags: ["Session"],
    security: [{ gameToken: [] }],

    response: {
      200: {
        description: "Session successfully ended.",
        type: "object",
        properties: { message: { type: "string", example: "Session ended" } },
      },
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/end/"),
]);

ApplyMethodDecorators(SessionController, "deleteSession", [
  Schema({
    description:
      "Permanently delete a session and all its associated data. Admin only.",
    tags: ["Session"],
    security: [{ gameToken: [] }],

    response: {
      200: {
        description: "Session successfully deleted.",
        type: "object",
        properties: { message: { type: "string", example: "Session deleted" } },
      },
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Delete("/"),
]);

ApplyMethodDecorators(SessionController, "nextQuestion", [
  Schema({
    description:
      "Advance the session to the next question in the quiz sequence. Requires moderator role.",
    tags: ["Session"],
    security: [{ gameToken: [] }],

    response: {
      200: {
        description: "Successfully moved to the next question.",
        type: "object",
        properties: {
          message: { type: "string", example: "Next question active" },
        },
      },
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/next/"),
]);

ApplyMethodDecorators(SessionController, "joinSession", [
  Schema({
    description:
      "Join an active session as a participant using a public key and nickname.",
    tags: ["Session"],
    security: [],
    body: {
      type: "object",
      required: ["session_public_key", "participant_nickname"],
      properties: {
        session_public_key: {
          type: "string",
          description: "The 6-character code of the session.",
        },
        participant_nickname: {
          type: "string",
          description: "The display name chosen by the player.",
        },
      },
    },
    response: {
      200: {
        description:
          "Successfully joined. Returns the participant's new game token.",
        type: "object",
        properties: {
          participant_id: {
            type: "string",
            description: "Unique identifier for this player in the session.",
          },
          game_token: {
            type: "string",
            description: "JWT token for future participant operations.",
          },
        },
      },
      400: ErrorResponse,
      404: ErrorResponse,
      409: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  Public(),
  Post("/join/"),
]);

ApplyMethodDecorators(SessionController, "leaveSession", [
  Schema({
    description:
      "Leave the current session. Requires a valid participant game token.",
    tags: ["Session"],
    security: [{ gameToken: [] }],
    body: { type: "object" },
    response: {
      200: {
        description: "Successfully left the session.",
        type: "object",
        properties: { message: { type: "string", example: "Left session" } },
      },
      401: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Post("/leave/"),
]);

ApplyMethodDecorators(SessionController, "getCurrentQuestion", [
  Schema({
    description: "Get the current active question for the session.",
    tags: ["Session"],
    security: [{ gameToken: [] }],
    response: {
      200: {
        description:
          "Successfully retrieved current question. Returns null if no question is active.",
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
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Get("/current-question/"),
]);

ApplyMethodDecorators(SessionController, "submitResponse", [
  Schema({
    description: "Submit a response for the current question.",
    tags: ["Session"],
    security: [{ gameToken: [] }],
    body: {
      type: "object",
      required: ["choiceIds"],
      properties: {
        choiceIds: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    response: {
      206: { description: "Response acknowledged, processing asynchronously." },
      401: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Post("/submit/"),
]);

ApplyMethodDecorators(SessionController, "answerBuzzer", [
  Schema({
    description:
      "Submit host decision for the current buzzer participant (correct/incorrect).",
    tags: ["Session", "Buzzer"],
    security: [{ gameToken: [] }],
    body: {
      type: "object",
      required: ["participantId", "isCorrect"],
      properties: {
        participantId: { type: "string" },
        isCorrect: { type: "boolean" },
      },
    },
    response: {
      200: {
        description: "Buzzer answer processed successfully.",
        type: "object",
        properties: {
          message: { type: "string", example: "Buzzer answer processed" },
        },
      },
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
      409: ErrorResponse,
      500: ErrorResponse,
    },
  }),
  UseGameToken(),
  Roles([UserRole.ADMIN, UserRole.MODERATOR]),
  Post("/buzzer/answer/"),
]);

Controller("/sessions")(SessionController);
