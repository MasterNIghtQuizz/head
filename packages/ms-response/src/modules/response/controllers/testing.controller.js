import {
  Controller,
  BaseController,
  Post,
  Public,
  ApplyMethodDecorators,
} from "common-core";
import { db } from "../../../database.js";
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
    logger.info("SEED: Starting ms-response database and cache cleanup");

    try {
      if (!db.instance) {
        logger.error("SEED: Database instance is NOT initialized");
        return reply.code(500).send({ message: "Database not initialized" });
      }

      // Using raw query like ms-user for reliability
      logger.info("SEED: Truncating tables...");
      await db.instance.query("TRUNCATE TABLE response CASCADE");
      await db.instance.query("TRUNCATE TABLE processed_events CASCADE");
      logger.info("SEED: Tables truncated");

      // Clear all keys related to ms-response in Valkey
      logger.info("SEED: Clearing Valkey cache...");
      const valkeyService = request.server.valkeyService;
      if (valkeyService && valkeyService.client) {
        const client = valkeyService.client;
        const keys = await client.keys("quiz:*");
        const keys2 = await client.keys("sessionQuizId:*");
        const keys3 = await client.keys("currentSessionQuestion:*");

        const allKeys = [...keys, ...keys2, ...keys3];
        if (allKeys.length > 0) {
          logger.info({ count: allKeys.length }, "SEED: Deleting Valkey keys");
          await client.del(allKeys);
        }
      }
      logger.info("SEED: Valkey cache cleared");

      logger.info("SEED: ms-response seeding completed successfully");
      return reply.code(204).send();
    } catch (/** @type {any} */ error) {
      logger.error({ error }, "SEED: Failed to seed ms-response");
      return reply.code(500).send({
        message: "Failed to seed ms-response",
        error: error.message,
      });
    }
  }
}

ApplyMethodDecorators(TestingController, "seed", [Post("/seed"), Public()]);

Controller("/testing")(TestingController);
