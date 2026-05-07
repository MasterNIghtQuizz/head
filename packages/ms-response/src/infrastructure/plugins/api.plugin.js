import { ControllerFactory } from "common-core";
import { ResponseController } from "../../modules/response/controllers/response.controller.js";
import { TestingController } from "../../modules/response/controllers/testing.controller.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} api
 */
export async function apiPlugin(api) {
  const responseService = api.responseService;
  ControllerFactory.register(api, ResponseController, [responseService]);
  ControllerFactory.register(api, TestingController, []);

  api.get("/health", async () => {
    return { status: "ok", service: "ms-response" };
  });
}
