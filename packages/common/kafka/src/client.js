import { Kafka, logLevel } from "kafkajs";
import logger from "common-logger";

const PinoLogCreator = () => {
  /**
   * @param {import('kafkajs').LogEntry} entry
   */
  return ({ namespace, level, label, log }) => {
    const { message, ...extra } = log;
    switch (level) {
      case logLevel.ERROR:
      case logLevel.NOTHING:
        logger.error({ namespace, label, ...extra }, message);
        break;
      case logLevel.WARN:
        logger.warn({ namespace, label, ...extra }, message);
        break;
      case logLevel.INFO:
        logger.info({ namespace, label, ...extra }, message);
        break;
      case logLevel.DEBUG:
        logger.debug({ namespace, label, ...extra }, message);
        break;
    }
  };
};

/**
 * Creates a KafkaJS client mapped to the common-logger (Pino).
 *
 * @param {import('kafkajs').KafkaConfig} config
 * @returns {import('kafkajs').Kafka}
 */
export function createKafkaClient(config) {
  return new Kafka({
    ...config,
    logCreator: PinoLogCreator,
  });
}
