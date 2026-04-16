import Fastify from "fastify";
import logger from "./logger.js";
import { initDatabase, db } from "./database.js";
import { ControllerFactory } from "common-core";
import { ResponseController } from "./modules/response/controllers/response.controller.js";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { TypeOrmResponseRepository } from "./modules/response/infra/persistence/typeorm-response.repository.js";
import { ResponseService } from "./modules/response/services/response.service.js";
import { QuizClient } from "./infrastructure/clients/quiz.client.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  await initDatabase();

  const responseRepo = new TypeOrmResponseRepository(
    db.instance.getRepository("ResponseModel"),
  );

  const quizClient = new QuizClient();

  const responseService = new ResponseService(responseRepo, quizClient);

  const responseController = new ResponseController(responseService);

  responseController.register(fastify);

  fastify.get("/health", async () => {
    return { status: "ok", service: "ms-response" };
  });

  return fastify;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fastify = await createServer();

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });

  console.log(`Server running on port ${config.port}`);
}
