import { SessionService } from '../modules/session/services/session.service.js';
import { ParticipantService } from '../modules/session/services/participant.service.js';
import { ValkeyService } from 'common-valkey';

declare module 'fastify' {
  interface FastifyInstance {
    sessionService: SessionService;
    participantService: ParticipantService;
    valkeyService: ValkeyService;
    kafkaProducer: import('common-kafka').KafkaProducer | null;
  }
  export type AppInstance = FastifyInstance;
}
