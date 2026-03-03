import {
  BaseController,
  Controller,
  Post,
  Schema,
  Public,
  ApplyMethodDecorators,
} from "common-core";

export class HelpersController extends BaseController {
  /**
   * @param {import('../services/helpers.service.js').HelpersService} helpersService
   */
  constructor(helpersService) {
    super();
    this.helpersService = helpersService;
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} _reply
   */
  async generateInternalToken(_request, _reply) {
    const token = this.helpersService.generateInfiniteToken();
    return { token };
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { userId?: string, role?: string } }>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async generateAccessToken(request, _reply) {
    const { userId, role } = request.body || {};
    const token = this.helpersService.generateInfiniteAccessToken(userId, role);
    return { token };
  }

  /**
   * @param {import('fastify').FastifyRequest<{ Body: { userId?: string, role?: string } }>} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async generateRefreshToken(request, _reply) {
    const { userId, role } = request.body || {};
    const token = this.helpersService.generateInfiniteRefreshToken(
      userId,
      role,
    );
    return { token };
  }
}

ApplyMethodDecorators(HelpersController, "generateInternalToken", [
  Schema({
    description:
      "Generate an infinite internal token for service-to-service communication.",
    tags: ["Helpers"],
    response: {
      200: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
      },
    },
  }),
  Public(),
  Post("/internal-token"),
]);

ApplyMethodDecorators(HelpersController, "generateAccessToken", [
  Schema({
    description: "Generate an infinite access token (100 years).",
    tags: ["Helpers"],
    body: {
      type: "object",
      properties: {
        userId: { type: "string" },
        role: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
      },
    },
  }),
  Public(),
  Post("/access-token"),
]);

ApplyMethodDecorators(HelpersController, "generateRefreshToken", [
  Schema({
    description: "Generate an infinite refresh token (100 years).",
    tags: ["Helpers"],
    body: {
      type: "object",
      properties: {
        userId: { type: "string" },
        role: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
      },
    },
  }),
  Public(),
  Post("/refresh-token"),
]);

Controller("/helpers")(HelpersController);
