import {
  Controller,
  BaseController,
  Post,
  Public,
  ApplyMethodDecorators,
} from "common-core";
import { db } from "../../../database.js";
import { ResponseEntity } from "../core/entities/response.entity.js";
import { ProcessedEventEntity } from "common-database";
import logger from "../../../logger.js";

export class TestingController extends BaseController {
  constructor() {
    super();
  }

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async seed(request, reply) {
    logger.info("Cleaning ms-response database and cache for E2E tests");

    try {
      const responseRepo = db.instance.getRepository(ResponseEntity);
      const processedEventRepo =
        db.instance.getRepository(ProcessedEventEntity);

      await responseRepo.delete({});
      await processedEventRepo.delete({});

      // Clear all keys related to ms-response in Valkey
      const valkeyService = request.server.valkeyService;
      if (valkeyService && valkeyService.client) {
        const client = valkeyService.client;
        const keys = await client.keys("quiz:*");
        const keys2 = await client.keys("sessionQuizId:*");
        const keys3 = await client.keys("currentSessionQuestion:*");

        const allKeys = [...keys, ...keys2, ...keys3];
        if (allKeys.length > 0) {
          await client.del(allKeys);
        }
      }

      return reply.code(204).send();
    } catch (error) {
      logger.error({ error }, "Failed to seed ms-response");
      return reply.code(500).send({ message: "Failed to seed ms-response" });
    }
  }
}

ApplyMethodDecorators(TestingController, "seed", [Post("/seed"), Public()]);

Controller("/testing")(TestingController);
