import fp from "fastify-plugin";
import { db } from "../../database.js";
import { TypeOrmResponseRepository } from "../../modules/response/infra/persistence/typeorm-response.repository.js";
import { ResponseService } from "../../modules/response/services/response.service.js";
import { QuizClient } from "../clients/quiz.client.js";
import { SessionClient } from "../clients/session.client.js";
import { ValkeyRepository, ValkeyService } from "common-valkey";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 */
async function servicesPluginImpl(fastify) {
  const valkeyService = new ValkeyService(config.valkey);
  if (config.valkey.enabled) {
    await valkeyService.connect();
  }

  const valkeyRepository = new ValkeyRepository(valkeyService);

  const responseRepo = new TypeOrmResponseRepository(
    db.instance,
    valkeyRepository,
  );

  const quizClient = new QuizClient();
  const sessionClient = new SessionClient();
  const responseService = new ResponseService(
    responseRepo,
    valkeyRepository,
    quizClient,
    sessionClient,
  );

  fastify.decorate("responseService", responseService);
  fastify.decorate("valkeyService", valkeyService);
}

export const servicesPlugin = fp(servicesPluginImpl);
