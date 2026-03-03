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
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} _reply
   */
  async pingMsUser(request, _reply) {
    const internalToken = request.internalToken;
    if (!internalToken) {
      throw new Error("Missing internal token");
    }

    const { ok } = await this.userService.pingMsUser(internalToken);
    return { ok };
  }
}

ApplyMethodDecorators(UserController, "pingMsUser", [
  Schema({
    description: "Ping MS User from API Gateway.",
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
  Get("/ping-ms"),
]);

Controller("/user")(UserController);
