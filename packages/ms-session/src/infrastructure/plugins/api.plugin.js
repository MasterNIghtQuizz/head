import { ControllerFactory } from "common-core";
import { SessionController } from "../../modules/session/controllers/session.controller.js";
import { ParticipantController } from "../../modules/session/controllers/participant.controller.js";
import { TestingController } from "../../modules/session/controllers/testing.controller.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} api
 */
export async function apiPlugin(api) {
  const sessionService = api.sessionService;
  const participantService = api.participantService;

  const jsonParser = (
    /** @type {import('fastify').FastifyRequest} */ _req,
    /** @type {string | Buffer} */ body,
    /** @type {(err: Error | null, body?: unknown) => void} */ done,
  ) => {
    if (!body || body.toString().trim() === "") {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err) {
      const error = /** @type {import('common-errors').BaseError} */ (err);
      error.statusCode = 400;
      done(error);
    }
  };

  api.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    jsonParser,
  );

  ControllerFactory.register(api, SessionController, [sessionService]);
  ControllerFactory.register(api, ParticipantController, [participantService]);
  ControllerFactory.register(api, TestingController, []);

  api.get("/health", { config: { isPublic: true } }, async () => {
    return { status: "ok", service: "ms-session" };
  });
}
