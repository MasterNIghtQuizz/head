import {
  Controller,
  BaseController,
  Post,
  ApplyMethodDecorators,
  Schema,
} from "common-core";
import { JoinSessionRequestDto } from "../contracts/session.dto.js";
import {
  SESSION_INVALID_STATUS,
  SESSION_NOT_FOUND,
} from "../errors/session.errors.js";

export class ParticipantController extends BaseController {
  /**
   * @param {import('../services/participant.service.js').ParticipantService} participantService
   */
  constructor(participantService) {
    super();
    this.participantService = participantService;
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: JoinSessionRequestDto}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('../contracts/session.dto.js').JoinSessionResponse>}
   */
  async joinSession(request, reply) {
    const { error } = JoinSessionRequestDto.validate(request.body);
    if (error) {
      return reply.code(400).send({ message: error.details[0].message });
    }
    try {
      const response = await this.participantService.joinSession(request.body);
      return reply.code(200).send(response);
    } catch (error) {
      if (error instanceof SESSION_INVALID_STATUS) {
        return reply.code(400).send({ message: error });
      } else if (error instanceof SESSION_NOT_FOUND) {
        return reply.code(404).send({ message: error });
      } else {
        throw error;
      }
    }
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/session.dto.js').LeaveSessionRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async leaveSession(request, reply) {
    await this.participantService.leaveSession(request.body);
    return reply.code(200).send();
  }
}

ApplyMethodDecorators(ParticipantController, "joinSession", [
  Schema({
    description: "Request body for joining a session",
    tags: ["Participant", "Session"],
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
      400: {
        description: "Invalid request",
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
  Post("/join"),
]);

ApplyMethodDecorators(ParticipantController, "leaveSession", [
  Schema({
    description: "Request body for leaving a session",
    tags: ["Participant", "Session"],
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
      400: {
        description: "Invalid request",
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
      },
    },
  }),
  Post("/leave"),
]);

Controller("/sessions")(ParticipantController);
