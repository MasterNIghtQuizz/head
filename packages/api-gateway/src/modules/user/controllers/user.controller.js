import {
  BaseController,
  Controller,
  Get,
  Post,
  Public,
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

  /**
   * @param {import('fastify').FastifyRequest<{Body: {email: string, role: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async register(request, reply) {
    const user = await this.userService.register(request.body);
    return reply.code(201).send(user);
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

ApplyMethodDecorators(UserController, "register", [
  Public(),
  Schema({
    description: "Forward registration to MS User.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["email", "role"],
      properties: {
        email: { type: "string", format: "email" },
        role: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          userId: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Post("/register"),
]);

Controller("/user")(UserController);
