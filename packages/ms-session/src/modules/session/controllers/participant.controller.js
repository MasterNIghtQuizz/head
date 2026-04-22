import {
  Controller,
  BaseController,
  Post,
  ApplyMethodDecorators,
  Schema,
  Public,
} from "common-core";
import { JoinSessionRequestDto } from "../contracts/session.dto.js";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "common-errors";
import logger from "common-logger";

export class ParticipantController extends BaseController {
  /** @type {import('../services/participant.service.js').ParticipantService} */
  participantService;

  /**
   * @param {import('../services/participant.service.js').ParticipantService} participantService
   */
  constructor(participantService) {
    super();
    this.participantService = participantService;
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
      if (error instanceof ConflictError) {
        return reply.code(400).send({ message: error.message });
      } else if (error instanceof NotFoundError) {
        return reply.code(404).send({ message: error.message });
      } else {
        throw error;
      }
    }
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async leaveSession(request, reply) {
    const { participantId } = this._getInternalPayload(request);
    if (!participantId) {
      throw new UnauthorizedError("Missing participant id");
    }
    await this.participantService.leaveSession(participantId);
    return reply.code(200).send();
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { choiceIds: string[] } }>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async submitResponse(request, reply) {
    const { sessionId, participantId } = this._getInternalPayload(request);
    if (!sessionId || !participantId) {
      throw new UnauthorizedError("Missing session id or participant id");
    }
    let { choiceIds } = request.body;

    if (!Array.isArray(choiceIds)) {
      choiceIds = [choiceIds];
    }

    try {
      await this.participantService.submitResponse({
        sessionId,
        participantId,
        choiceIds,
      });

      logger.info(
        { sessionId, participantId, choiceIds },
        "Participant submitted a response",
      );

      return reply.code(206).send();
    } catch (error) {
      if (error instanceof ConflictError) {
        return reply.code(409).send({ message: error.message });
      } else if (error instanceof NotFoundError) {
        return reply.code(404).send({ message: error.message });
      } else if (error instanceof BadRequestError) {
        return reply.code(400).send({ message: error.message });
      }
      throw error;
    }
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async validateBuzzer(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    try {
      await this.participantService.validateBuzzerResponse(sessionId);
      return reply.code(200).send();
    } catch (error) {
      if (error instanceof BadRequestError) {
        return reply.code(400).send({ message: error.message });
      } else if (error instanceof NotFoundError) {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<void>}
   */
  async rejectBuzzer(request, reply) {
    const { sessionId } = this._getInternalPayload(request);
    if (!sessionId) {
      throw new UnauthorizedError("Missing session id");
    }
    await this.participantService.rejectBuzzerResponse(sessionId);
    return reply.code(200).send();
  }
}

ApplyMethodDecorators(ParticipantController, "joinSession", [
  Schema({
    description: "Internal route to handle session joining logic.",
    tags: ["Participant", "Session"],
    security: [{ internalToken: [] }],
    body: {
      type: "object",
      required: ["session_public_key", "participant_nickname"],
      properties: {
        session_public_key: { type: "string" },
        participant_nickname: { type: "string" },
      },
    },
    response: {
      200: {
        description: "Participant joined successfully.",
        type: "object",
        properties: {
          participant_id: { type: "string" },
          game_token: { type: "string" },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      409: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Public(),
  Post("/join/"),
]);

ApplyMethodDecorators(ParticipantController, "leaveSession", [
  Schema({
    description: "Internal route to handle session leaving logic.",
    tags: ["Participant", "Session"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Participant left successfully." },
      401: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/leave/"),
]);

ApplyMethodDecorators(ParticipantController, "submitResponse", [
  Schema({
    description: "Submit a response for the current question.",
    tags: ["Participant", "Session"],
    security: [{ internalToken: [] }],
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
      401: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/submit/"),
]);

ApplyMethodDecorators(ParticipantController, "validateBuzzer", [
  Schema({
    description: "Validate the current buzzer response (Host only).",
    tags: ["Participant", "Session", "Buzzer"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Buzzer response validated successfully." },
      400: { type: "object", properties: { message: { type: "string" } } },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/buzzer/validate/"),
]);

ApplyMethodDecorators(ParticipantController, "rejectBuzzer", [
  Schema({
    description: "Reject the current buzzer response and move to next (Host only).",
    tags: ["Participant", "Session", "Buzzer"],
    security: [{ internalToken: [] }],
    response: {
      200: { description: "Buzzer response rejected successfully." },
      401: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/buzzer/reject/"),
]);

Controller("/sessions")(ParticipantController);
