import fp from "fastify-plugin";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { KafkaLagCollector } from "common-metrics";
import { UserEventsConsumer } from "../kafka/consumers/user-events.consumer.js";
import { ProcessedEventEntity } from "common-database";
import { db } from "../../database.js";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {boolean} opts.metricsEnabled
 */
async function kafkaPluginImpl(fastify, { metricsEnabled }) {
  if (!config.kafka.enabled) {
    fastify.decorate("kafkaConsumer", null);
    return;
  }

  const kafkaClient = createKafkaClient({
    clientId: "ms-quizz-management",
    brokers: config.kafka.brokers,
  });

  const consumer = new KafkaConsumer(kafkaClient, {
    groupId: "ms-quizz-management-group",
  });

  const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);
  new UserEventsConsumer(consumer, processedEventRepo).register();

  try {
    await consumer.start();
  } catch (error) {
    logger.error(
      { error },
      "Kafka connection failed. Service will start without Kafka consumer.",
    );
  }

  if (metricsEnabled) {
    const lagCollector = new KafkaLagCollector(kafkaClient, [
      { groupId: "ms-quizz-management-group", topics: ["user.events"] },
    ]);
    lagCollector.start();
  }

  fastify.decorate("kafkaConsumer", consumer);
}

export const kafkaPlugin = fp(kafkaPluginImpl);
