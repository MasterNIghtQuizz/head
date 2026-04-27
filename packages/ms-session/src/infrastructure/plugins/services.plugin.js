import fp from "fastify-plugin";
import { db, valkey } from "../../database.js";
import { SessionService } from "../../modules/session/services/session.service.js";
import { TypeOrmSessionRepository } from "../../modules/session/infra/persistence/typeorm-session.repository.js";
import { TypeOrmParticipantRepository } from "../../modules/session/infra/persistence/typeorm-participant.repository.js";
import { ParticipantService } from "../../modules/session/services/participant.service.js";
import { ValkeyRepository } from "common-valkey";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {import('common-kafka').KafkaProducer | null} opts.kafkaProducer
 */
async function servicesPluginImpl(fastify, { kafkaProducer }) {
  const valkeyRepository = new ValkeyRepository(valkey);
  const sessionRepository = new TypeOrmSessionRepository(
    db.instance,
    valkeyRepository,
  );
  const participantRepository = new TypeOrmParticipantRepository(
    db.instance,
    valkeyRepository,
  );

  const sessionService = new SessionService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
  );

  const participantService = new ParticipantService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
  );

  fastify.decorate("sessionService", sessionService);
  fastify.decorate("participantService", participantService);
}

export const servicesPlugin = fp(servicesPluginImpl);
