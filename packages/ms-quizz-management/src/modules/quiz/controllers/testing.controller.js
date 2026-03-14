import {
  BaseController,
  Post,
  ApplyMethodDecorators,
  Controller,
  Public,
} from "common-core";

export class TestingController extends BaseController {
  constructor() {
    super();
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} reply
   */
  async seed(_request, reply) {
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(TestingController, "seed", [Post("/seed"), Public()]);

Controller("/testing")(TestingController);
