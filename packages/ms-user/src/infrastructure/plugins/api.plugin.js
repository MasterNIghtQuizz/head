import { ControllerFactory } from "common-core";
import { UserController } from "../../modules/user/controllers/user.controller.js";
import { TestingController } from "../../modules/user/controllers/testing.controller.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} api
 */
export async function apiPlugin(api) {
  const userService = api.userService;
  ControllerFactory.register(api, UserController, [userService]);
  ControllerFactory.register(api, TestingController, []);

  api.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "ms-user" };
  });
}
