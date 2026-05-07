import fp from "fastify-plugin";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { SessionEventsConsumer } from "../kafka/consumers/session-events.consumer.js";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
async function kafkaPluginImpl(fastify) {
  if (!config.kafka || !config.kafka.enabled) {
    fastify.decorate("kafkaConsumer", null);
    return;
  }

  const kafkaClient = createKafkaClient({
    clientId: "ws-service",
    brokers: config.kafka.brokers,
  });

  const kafkaConsumer = new KafkaConsumer(kafkaClient, {
    groupId: "ws-service-group",
  });
  new SessionEventsConsumer(kafkaConsumer).register();

  try {
    await kafkaConsumer.start();
  } catch (error) {
    logger.error({ error }, "Kafka connection failed");
  }

  fastify.decorate("kafkaConsumer", kafkaConsumer);
}

export const kafkaPlugin = fp(kafkaPluginImpl);
