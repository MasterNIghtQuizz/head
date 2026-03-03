import {
  BaseController,
  Controller,
  Get,
  Post,
  Schema,
  Public,
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

  /**
   * @param {import('fastify').FastifyRequest<{Body: {email: string, role: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async register(request, reply) {
    const user = await this.userService.register(request.body);
    return reply.code(201).send(user);
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

ApplyMethodDecorators(UserController, "register", [
  Public(),
  Schema({
    description: "Register a new user and publish Kafka event.",
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

Controller("/users")(UserController);

