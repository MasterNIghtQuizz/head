import fp from "fastify-plugin";
import { createKafkaClient, KafkaProducer } from "common-kafka";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 */
async function kafkaPluginImpl(fastify) {
  if (!config.kafka.enabled) {
    fastify.decorate("kafkaProducer", null);
    return;
  }

  const kafkaClient = createKafkaClient({
    clientId: "ms-user",
    brokers: config.kafka.brokers,
  });

  const producer = new KafkaProducer(kafkaClient);
  try {
    await producer.connect();
  } catch (error) {
    logger.error(
      { error },
      "Kafka connection failed. Service will start without Kafka producer.",
    );
  }

  fastify.decorate("kafkaProducer", producer);
}

export const kafkaPlugin = fp(kafkaPluginImpl);
