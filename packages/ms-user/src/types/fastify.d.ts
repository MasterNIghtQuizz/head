import { 
  FastifyInstance, 
  RawServerDefault, 
  RawRequestDefaultExpression, 
  RawReplyDefaultExpression, 
  FastifyTypeProviderDefault 
} from "fastify";
import { Logger } from "pino";
import { UserService } from "../modules/user/services/user.service.js";
import { KafkaProducer } from "common-kafka";

declare module "fastify" {
  interface FastifyInstance {
    userService: UserService;
    kafkaProducer: KafkaProducer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
