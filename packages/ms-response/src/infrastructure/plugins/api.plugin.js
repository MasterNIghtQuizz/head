import { ControllerFactory } from "common-core";
import { ResponseController } from "../../modules/response/controllers/response.controller.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} api
 */
export async function apiPlugin(api) {
  const responseService = api.responseService;
  ControllerFactory.register(api, ResponseController, [responseService]);

  api.get("/health", async () => {
    return { status: "ok", service: "ms-response" };
  });
}
