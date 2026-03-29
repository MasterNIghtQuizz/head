import { UserRole } from "common-auth";
import {
  ApplyMethodDecorators,
  BaseController,
  Controller,
  Post,
  Roles,
  Schema,
} from "common-core";
import { UnauthorizedError } from "common-errors";

export class WebSocketController extends BaseController {
  /**
   * @param {import('../services/websocket.service.js').WebSocketService} webSocketService
   */

  constructor(webSocketService) {
    super();
    this.webSocketService = webSocketService;
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
    * @returns {Promise<import('common-contracts').WebSocketConnectResponse>}
   */
  async connect(request, reply) {
    if (!request.user?.userId) {
      throw new UnauthorizedError("Authentication required");
    }

    const userId = /** @type {string} */ (request.user.userId);
    const user = await this.webSocketService.connect(userId);
    return reply.code(200).send(user);
  }
}

ApplyMethodDecorators(WebSocketController, "connect", [
  Roles([UserRole.USER, UserRole.ADMIN]),
  Schema({
    description: "Connect to WebSocket. Roles: ADMIN & USER.",
    tags: ["WebSockets"],
    response: {
      200: {
        type: "object",
        required: ["wsUrl", "userId"],
        properties: {
          wsUrl: { type: "string" },
          userId: { type: "string" },
        },
      },
    },
  }),
  Post("/connect"),
]);

Controller("/websocket")(WebSocketController);
