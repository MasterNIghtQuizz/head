import fp from "fastify-plugin";
import { createKafkaClient, KafkaConsumer } from "common-kafka";
import { ProcessedEventEntity } from "common-database";
import { ResponseEventsConsumer } from "../kafka/consumers/response-events.consumer.js";
import { db } from "../../database.js";
import logger from "../../logger.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.js').AppInstance} fastify
 * @param {Object} opts
 * @param {import('../../modules/response/services/response.service.js').ResponseService} opts.responseService
 */
async function kafkaPluginImpl(fastify, { responseService }) {
  if (!config.kafka.enabled) {
    fastify.decorate("kafkaConsumer", null);
    return;
  }

  const kafkaClient = createKafkaClient({
    clientId: "ms-response",
    brokers: config.kafka.brokers,
  });

  const consumer = new KafkaConsumer(kafkaClient, {
    groupId: "ms-response-group",
  });

  const processedEventRepo = db.instance.getRepository(ProcessedEventEntity);

  new ResponseEventsConsumer(
    consumer,
    processedEventRepo,
    responseService,
  ).register();

  await consumer.start();
  logger.info({ groupId: "ms-response-group" }, "Kafka consumer started");

  fastify.decorate("kafkaConsumer", consumer);
}

export const kafkaPlugin = fp(kafkaPluginImpl);
