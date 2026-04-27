import fp from "fastify-plugin";
import {
  createKafkaClient,
  KafkaProducer,
  KafkaConsumer,
  KafkaAdmin,
} from "common-kafka";
import { KafkaLagCollector } from "common-metrics";
import { SessionEventTypes } from "common-contracts";
import { SessionLoggerDemo } from "../../demo/session-logger.demo.js";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {boolean} opts.metricsEnabled
 */
async function kafkaPluginImpl(fastify, { metricsEnabled }) {
  if (!config.kafka.enabled) {
    fastify.decorate("kafkaProducer", null);
    fastify.decorate("kafkaConsumer", null);
    return;
  }

  const kafkaClient = createKafkaClient({
    clientId: "ms-session",
    brokers: config.kafka.brokers,
  });

  const kafkaAdmin = new KafkaAdmin(kafkaClient);
  try {
    await kafkaAdmin.ensureTopics(Object.values(SessionEventTypes));
  } catch (error) {
    logger.error(
      { error },
      "Failed to ensure Kafka topics. Service might fail during production or consumption.",
    );
  }

  const producer = new KafkaProducer(kafkaClient);
  try {
    await producer.connect();
  } catch (error) {
    logger.error(
      { error },
      "Kafka connection failed. Service will start without Kafka producer.",
    );
  }

  const consumer = new KafkaConsumer(kafkaClient, {
    groupId: "ms-session-demo-group",
  });
  const sessionLoggerDemo = new SessionLoggerDemo(consumer);
  sessionLoggerDemo.register();

  try {
    await consumer.start();
  } catch (error) {
    logger.error(
      { error },
      "Kafka Consumer connection failed. Demo logger will not be active.",
    );
  }

  if (metricsEnabled) {
    const lagCollector = new KafkaLagCollector(kafkaClient, [
      {
        groupId: "ms-session-demo-group",
        topics: Object.values(SessionEventTypes),
      },
    ]);
    lagCollector.start();
  }

  fastify.decorate("kafkaProducer", producer);
  fastify.decorate("kafkaConsumer", consumer);
}

export const kafkaPlugin = fp(kafkaPluginImpl);
