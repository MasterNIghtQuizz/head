import {
  createKafkaClient,
  KafkaAdmin,
} from "../packages/common/kafka/src/index.js";
import {
  Topics,
  SessionEventTypes,
} from "../packages/common/contracts/src/events.js";
import logger from "../packages/common/logger/index.js";

const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(",") || [
  "localhost:9092",
];

async function run() {
  const kafkaClient = createKafkaClient({
    clientId: "setup-script",
    brokers: KAFKA_BROKERS,
  });

  const admin = new KafkaAdmin(kafkaClient);

  const allTopics = [
    ...Object.values(Topics),
    ...Object.values(SessionEventTypes),
  ];

  logger.info("Starting Kafka topics setup...");
  try {
    await admin.ensureTopics(allTopics);
    logger.info("Successfully ensured all topics exist.");
  } catch (error) {
    logger.error({ error }, "Failed to setup Kafka topics");
    process.exit(1);
  }
}

run();
