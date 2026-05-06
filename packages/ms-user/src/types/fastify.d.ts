import { UserService } from '../modules/user/services/user.service.js';
import { ValkeyService } from 'common-valkey';

declare module 'fastify' {
  interface FastifyInstance {
    userService: UserService;
    valkeyService: ValkeyService;
    kafkaProducer: import('common-kafka').KafkaProducer | null;
  }
  export type AppInstance = FastifyInstance;
}
