import {
  BaseController,
  Controller,
  Post,
  Schema,
  Public,
  ApplyMethodDecorators,
  Roles,
} from "common-core";
import { UserRole } from "common-auth";
import { Get, Put, Delete } from "common-core";
// eslint-disable-next-line no-unused-vars
import { UpdateUserDto } from "../contracts/user.dto.js";

export class UserController extends BaseController {
  /**
   * @param {import('../services/user.service.js').UserService} userService
   */
  constructor(userService) {
    super();
    this.userService = userService;
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/user.dto.js').RegisterUserDto}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async register(request, reply) {
    const user = await this.userService.register(request.body);
    return reply.code(201).send(user);
  }
  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/user.dto.js').RegisterUserDto}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async login(request, reply) {
    const user = await this.userService.login(request.body);
    return reply.code(200).send(user);
  }
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async refreshAccessToken(request, reply) {
    const { userId } = /** @type {{ userId: string }} */ (request.user);
    const tokens = await this.userService.refreshAccessToken(userId);
    return reply.code(200).send(tokens);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/user.dto.js').GrantPermissionsDto}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async grantPermissions(request, reply) {
    const { userId } = /** @type {{ userId: string }} */ (request.user);
    const user = await this.userService.grantPermissions(userId, request.body);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest} _request
   * @param {import('fastify').FastifyReply} reply
   */
  async findAll(_request, reply) {
    const users = await this.userService.findAll();
    return reply.code(200).send(users);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async findById(request, reply) {
    const user = await this.userService.findById(request.params.id);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: UpdateUserDto}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async updateUser(request, reply) {
    const user = await this.userService.updateUser(
      request.params.id,
      request.body,
    );
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteUser(request, reply) {
    await this.userService.deleteUser(request.params.id);
    return reply.code(204).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getMe(request, reply) {
    const { userId } = /** @type {{ userId: string }} */ (request.user);
    const user = await this.userService.findById(userId);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('../contracts/user.dto.js').UpdateUserDto}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async updateMe(request, reply) {
    const { userId } = /** @type {{ userId: string }} */ (request.user);
    const updateData = request.body;
    const user = await this.userService.updateUser(userId, updateData);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteMe(request, reply) {
    const { userId } = /** @type {{ userId: string }} */ (request.user);
    await this.userService.deleteUser(userId);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(UserController, "register", [
  Public(),
  Schema({
    description: "Register a new user and publish Kafka event.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
        },
      },
      400: { type: "object", properties: { message: { type: "string" } } },
      409: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/register"),
]);
ApplyMethodDecorators(UserController, "login", [
  Public(),
  Schema({
    description: "Login a user.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
        },
      },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Post("/login"),
]);
ApplyMethodDecorators(UserController, "refreshAccessToken", [
  Schema({
    description: "Refresh access and refresh tokens.",
    tags: ["User"],
    response: {
      200: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
            },
          },
        },
      },
      401: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
      500: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Get("/refresh-access-token"),
]);

ApplyMethodDecorators(UserController, "grantPermissions", [
  Schema({
    description: "Grant permissions to a user.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["role"],
      properties: {
        role: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Roles([UserRole.ADMIN]),
  Post("/permissions"),
]);

ApplyMethodDecorators(UserController, "findAll", [
  Schema({
    description: "Get all users.",
    tags: ["User"],
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
          },
        },
      },
    },
  }),
  Get("/"),
]);

ApplyMethodDecorators(UserController, "findById", [
  Schema({
    description: "Get user by ID.",
    tags: ["User"],
    params: {
      type: "object",
      properties: { id: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Get("/:id"),
]);

ApplyMethodDecorators(UserController, "updateUser", [
  Schema({
    description: "Update user.",
    tags: ["User"],
    params: {
      type: "object",
      properties: { id: { type: "string" } },
    },
    body: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
        role: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Put("/:id"),
]);

ApplyMethodDecorators(UserController, "deleteUser", [
  Schema({
    description: "Delete user.",
    tags: ["User"],
    params: {
      type: "object",
      properties: { id: { type: "string" } },
    },
    response: {
      204: { type: "null" },
    },
  }),
  Delete("/:id"),
]);

ApplyMethodDecorators(UserController, "getMe", [
  Schema({
    description: "Get current user profile.",
    tags: ["User"],
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Get("/me"),
]);

ApplyMethodDecorators(UserController, "updateMe", [
  Schema({
    description: "Update current user profile.",
    tags: ["User"],
    body: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  }),
  Put("/me"),
]);

ApplyMethodDecorators(UserController, "deleteMe", [
  Schema({
    description: "Delete current user account.",
    tags: ["User"],
    response: {
      204: { type: "null" },
    },
  }),
  Delete("/me"),
]);

Controller("/users")(UserController);
