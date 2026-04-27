import fp from "fastify-plugin";
import { db, valkey } from "../../database.js";
import { config } from "../../config.js";
import { UserService } from "../../modules/user/services/user.service.js";
import { TypeOrmUserRepository } from "../../modules/user/infra/persistence/typeorm-user.repository.js";
import { ValkeyRepository } from "common-valkey";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {import('common-kafka').KafkaProducer | null} opts.kafkaProducer
 */
async function servicesPluginImpl(fastify, { kafkaProducer }) {
  const valkeyRepository = new ValkeyRepository(valkey);
  const userRepository = new TypeOrmUserRepository(
    db.instance,
    valkeyRepository,
    config.security.encryptionKey,
  );

  const userService = new UserService(kafkaProducer, userRepository);

  fastify.decorate("userService", userService);
}

export const servicesPlugin = fp(servicesPluginImpl);
