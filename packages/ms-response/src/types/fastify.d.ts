import { 
  FastifyInstance, 
  RawServerDefault, 
  RawRequestDefaultExpression, 
  RawReplyDefaultExpression, 
  FastifyTypeProviderDefault 
} from "fastify";
import { Logger } from "pino";
import { ResponseService } from "../modules/response/services/response.service.js";
import { ValkeyService } from "common-valkey";
import { KafkaConsumer } from "common-kafka";

declare module "fastify" {
  interface FastifyInstance {
    responseService: ResponseService;
    valkeyService: ValkeyService;
    kafkaConsumer: KafkaConsumer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
