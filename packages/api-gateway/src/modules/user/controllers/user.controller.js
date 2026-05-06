import {
  BaseController,
  Controller,
  Post,
  Public,
  Schema,
  ApplyMethodDecorators,
  UseRefreshToken,
  Roles,
  Get,
  Put,
  Delete,
} from "common-core";

import { UserRole } from "common-auth";

export class UserController extends BaseController {
  /**
   * @param {import('../services/user.service.js').UserService} userService
   */
  constructor(userService) {
    super();
    this.userService = userService;
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('common-contracts').RegisterRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async register(request, reply) {
    const user = await this.userService.register(request.body);
    return reply.code(201).send(user);
  }
  /**
   * @param {import('fastify').FastifyRequest<{Body: import('common-contracts').LoginRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async login(request, reply) {
    const user = await this.userService.login(request.body);
    return reply.code(200).send(user);
  }
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async refreshToken(request, reply) {
    const internalToken = /** @type {string} */ (
      request.internalToken || request.headers["internal-token"]
    );
    const user = await this.userService.refreshToken(internalToken);
    return reply.code(200).send(user);
  }
  /**
   * @param {import('fastify').FastifyRequest<{Body: import('common-contracts').GrantPermissionRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async grantPermissions(request, reply) {
    const token = /** @type {string} */ (
      request.internalToken || request.headers["internal-token"]
    );
    const user = await this.userService.grantPermissions(request.body, token);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async findAll(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    const users = await this.userService.findAll(token);
    return reply.code(200).send(users);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async findById(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    const user = await this.userService.findById(request.params.id, token);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}, Body: import('common-contracts').UpdateUserRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async updateUser(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    const user = await this.userService.updateUser(
      request.params.id,
      request.body,
      token,
    );
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Params: {id: string}}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteUser(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    await this.userService.deleteUser(request.params.id, token);
    return reply.code(204).send();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getMe(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    const user = await this.userService.getMe(token);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest<{Body: import('common-contracts').UpdateUserRequest}>} request
   * @param {import('fastify').FastifyReply} reply
   */
  async updateMe(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    const user = await this.userService.updateMe(request.body, token);
    return reply.code(200).send(user);
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteMe(request, reply) {
    const token = /** @type {string} */ (request.internalToken);
    await this.userService.deleteMe(token);
    return reply.code(204).send();
  }
}

ApplyMethodDecorators(UserController, "register", [
  Public(),
  Schema({
    description: "Forward registration to MS User.",
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
    description: "Forward login to MS User.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["email"],
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

ApplyMethodDecorators(UserController, "refreshToken", [
  UseRefreshToken(),
  Schema({
    description: "Refresh Access Token",
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
  Post("/refresh-access-token"),
]);

ApplyMethodDecorators(UserController, "grantPermissions", [
  Schema({
    description: "Forward permission granting to MS User. Roles: ADMIN.",
    tags: ["User"],
    body: {
      type: "object",
      required: ["role", "user_id"],
      properties: {
        role: { type: "string" },
        user_id: { type: "string" },
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
      403: { type: "object", properties: { message: { type: "string" } } },
      404: { type: "object", properties: { message: { type: "string" } } },
    },
  }),
  Roles([UserRole.ADMIN]),
  Post("/permissions"),
]);

ApplyMethodDecorators(UserController, "findAll", [
  Roles([UserRole.ADMIN]),
  Schema({
    description: "Get all users. Roles: ADMIN.",
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
  Roles([UserRole.ADMIN]),
  Schema({
    description: "Get user by ID. Roles: ADMIN.",
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
  Roles([UserRole.ADMIN]),
  Schema({
    description: "Update user. Roles: ADMIN.",
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
  Roles([UserRole.ADMIN]),
  Schema({
    description: "Delete user. Roles: ADMIN.",
    tags: ["User"],
    params: {
      type: "object",
      properties: { id: { type: "string" } },
    },
    response: {
      204: {
        description: "No content",
      },
    },
  }),
  Delete("/:id"),
]);

ApplyMethodDecorators(UserController, "getMe", [
  Schema({
    description: "Get current user profile. Roles: ADMIN, USER, MODERATOR.",
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
    description: "Update current user profile. Roles: ADMIN, USER, MODERATOR.",
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
    description: "Delete current user account. Roles: ADMIN, USER, MODERATOR.",
    tags: ["User"],
    response: {
      204: {
        description: "No content",
      },
    },
  }),
  Delete("/me"),
]);

Controller("/user")(UserController);
