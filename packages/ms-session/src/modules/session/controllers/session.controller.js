import {
  Controller,
  BaseController,
  Get,
  Post,
  Delete,
  ApplyMethodDecorators,
} from "common-core";

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
    const session = await this.sessionService.createSession(request.body);
    return reply.code(201).send(session);
  }
}
