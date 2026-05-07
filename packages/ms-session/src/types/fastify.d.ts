import { SessionService } from '../modules/session/services/session.service.js';
import { ParticipantService } from '../modules/session/services/participant.service.js';
import { ValkeyService } from 'common-valkey';
import {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyTypeProviderDefault
} from 'fastify';
import { Logger } from 'pino';

declare module 'fastify' {
  interface FastifyInstance {
    sessionService: SessionService;
    participantService: ParticipantService;
    valkeyService: ValkeyService;
    kafkaProducer: import('common-kafka').KafkaProducer | null;
    kafkaConsumer: import('common-kafka').KafkaConsumer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
