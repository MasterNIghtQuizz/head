import {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyTypeProviderDefault
} from "fastify";
import { Logger } from "pino";
import { SessionService } from "../modules/session/services/session.service.js";
import { ParticipantService } from "../modules/session/services/participant.service.js";
import { KafkaProducer, KafkaConsumer } from "common-kafka";

declare module "fastify" {
  interface FastifyInstance {
    sessionService: SessionService;
    participantService: ParticipantService;
    kafkaProducer: KafkaProducer | null;
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
