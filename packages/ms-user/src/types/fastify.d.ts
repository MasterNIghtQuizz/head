import { UserService } from '../modules/user/services/user.service.js';
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
    userService: UserService;
    valkeyService: ValkeyService;
    kafkaProducer: import('common-kafka').KafkaProducer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
