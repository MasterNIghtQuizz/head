export { registry } from "./registry.js";
export {
  httpRequestDuration,
  httpRequestsTotal,
  httpActiveRequests,
  serviceUp,
  serviceStartTimestamp,
} from "./http-metrics.js";
export {
  kafkaConsumerLag,
  kafkaMessagesConsumed,
  kafkaMessagesPublished,
  KafkaLagCollector,
} from "./kafka-metrics.js";
export { createMetricsPlugin } from "./fastify-plugin.js";
