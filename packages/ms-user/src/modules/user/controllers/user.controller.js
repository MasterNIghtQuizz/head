import {
  BaseController,
  Controller,
  Get,
  Schema,
  ApplyMethodDecorators,
} from "common-core";

export class UserController extends BaseController {
  /**
   * @param {import('../services/user.service.js').UserService} userService
   */
  constructor(userService) {
    super();
    this.userService = userService;
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} _reply
   */
  async checkHealth(_request, _reply) {
    return this.userService.checkHealth();
  }
}

ApplyMethodDecorators(UserController, "checkHealth", [
  Schema({
    description: "Check user microservice health.",
    tags: ["User"],
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
    },
  }),
  Get("/health-check"),
]);

Controller("/users")(UserController);
