import {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyTypeProviderDefault
} from "fastify";
import { Logger } from "pino";

import { WebSocketServer } from 'ws';
import { KafkaConsumer } from 'common-kafka';
import { SessionNotificationsConsumer } from '../infrastructure/valkey/consumers/session-notifications.consumer.js';

declare module "fastify" {
  interface FastifyInstance {
    wss: WebSocketServer;
    kafkaConsumer: KafkaConsumer | null;
    valkeyConsumer: SessionNotificationsConsumer | null;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger,
  FastifyTypeProviderDefault
>;
