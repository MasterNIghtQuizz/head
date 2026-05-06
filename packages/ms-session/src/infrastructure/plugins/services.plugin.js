import fp from "fastify-plugin";
import { db, valkey } from "../../database.js";
import { SessionService } from "../../modules/session/services/session.service.js";
import { TypeOrmSessionRepository } from "../../modules/session/infra/persistence/typeorm-session.repository.js";
import { TypeOrmParticipantRepository } from "../../modules/session/infra/persistence/typeorm-participant.repository.js";
import { ParticipantService } from "../../modules/session/services/participant.service.js";
import { BuzzerRepository } from "../../modules/session/infra/repositories/buzzer.repository.js";
import { FeedBuzzerConsumer } from "../../modules/session/infra/consumers/feed-buzzer.consumer.js";
import { ValkeyRepository } from "common-valkey";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {import('common-kafka').KafkaProducer | null} opts.kafkaProducer
 * @param {import('common-kafka').KafkaConsumer | null} opts.kafkaConsumer
 */
async function servicesPluginImpl(fastify, { kafkaProducer, kafkaConsumer }) {
  const valkeyRepository = new ValkeyRepository(valkey);
  const sessionRepository = new TypeOrmSessionRepository(
    db.instance,
    valkeyRepository,
  );
  const participantRepository = new TypeOrmParticipantRepository(
    db.instance,
    valkeyRepository,
  );
  const buzzerRepository = new BuzzerRepository(valkey);

  if (kafkaConsumer) {
    const feedBuzzerConsumer = new FeedBuzzerConsumer(
      kafkaConsumer,
      buzzerRepository,
    );
    feedBuzzerConsumer.register();
  }

  const sessionService = new SessionService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    buzzerRepository,
  );

  const participantService = new ParticipantService(
    kafkaProducer,
    sessionRepository,
    participantRepository,
    valkeyRepository,
    sessionService,
    buzzerRepository,
  );

  fastify.decorate("sessionService", sessionService);
  fastify.decorate("participantService", participantService);
}

export const servicesPlugin = fp(servicesPluginImpl);
