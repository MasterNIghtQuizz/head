import { Gauge, Counter } from "prom-client";
import { registry } from "./registry.js";
import logger from "common-logger";

/**
 * Gauge — number of unconsumed messages per topic/partition/consumer-group.
 * Labels: topic, group_id, partition
 */
export const kafkaConsumerLag = new Gauge({
  name: "kafka_consumer_lag_messages",
  help: "Number of unconsumed messages in a Kafka partition (consumer lag)",
  labelNames: ["topic", "group_id", "partition"],
  registers: [registry],
});

/**
 * Counter — total Kafka messages consumed.
 * Labels: topic, group_id
 */
export const kafkaMessagesConsumed = new Counter({
  name: "kafka_messages_consumed_total",
  help: "Total number of Kafka messages consumed",
  labelNames: ["topic", "group_id"],
  registers: [registry],
});

/**
 * Counter — total Kafka messages published.
 * Labels: topic
 */
export const kafkaMessagesPublished = new Counter({
  name: "kafka_messages_published_total",
  help: "Total number of Kafka messages published",
  labelNames: ["topic"],
  registers: [registry],
});

/**
 * Polls Kafka admin at a fixed interval to compute per-partition consumer lag
 * and update the `kafka_consumer_lag_messages` gauge.
 *
 * Usage:
 *   const collector = new KafkaLagCollector(kafkaClient, [
 *     { groupId: "my-group", topics: ["my-topic"] }
 *   ]);
 *   collector.start();   // call once at service startup
 *   collector.stop();    // call on graceful shutdown
 */
export class KafkaLagCollector {
  /**
   * @param {import('kafkajs').Kafka} kafkaClient
   * @param {Array<{ groupId: string; topics: string[] }>} consumerGroups
   * @param {number} [intervalMs=30000]
   */
  constructor(kafkaClient, consumerGroups, intervalMs = 30_000) {
    this.kafkaClient = kafkaClient;
    this.consumerGroups = consumerGroups;
    this.intervalMs = intervalMs;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.intervalId = null;
  }

  start() {
    this._collect();
    this.intervalId = setInterval(() => this._collect(), this.intervalMs);
    // Do not prevent the process from exiting
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async _collect() {
    const admin = this.kafkaClient.admin();
    try {
      await admin.connect();

      for (const { groupId, topics } of this.consumerGroups) {
        await this._collectGroupLag(admin, groupId, topics);
      }
    } catch (err) {
      logger.warn({ err }, "KafkaLagCollector: failed to connect admin client");
    } finally {
      try {
        await admin.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  /**
   * @param {import('kafkajs').Admin} admin
   * @param {string} groupId
   * @param {string[]} topics
   */
  async _collectGroupLag(admin, groupId, topics) {
    try {
      const [committed, ...topicOffsets] = await Promise.all([
        admin.fetchOffsets({ groupId, topics }),
        ...topics.map((topic) =>
          admin
            .fetchTopicOffsets(topic)
            .then((offsets) => ({ topic, offsets })),
        ),
      ]);

      for (const { topic, offsets: latestOffsets } of topicOffsets) {
        const committedForTopic = committed.find((c) => c.topic === topic);
        if (!committedForTopic) {
          logger.warn(
            { topic, groupId },
            "KafkaLagCollector: no committed offsets found for topic",
          );
          continue;
        }

        for (const { partition, offset: highWatermark } of latestOffsets) {
          const partitionCommit = committedForTopic.partitions.find(
            (p) => p.partition === partition,
          );

          const committedOffset =
            partitionCommit && partitionCommit.offset !== "-1"
              ? Number(partitionCommit.offset)
              : 0;

          const lag = Math.max(0, Number(highWatermark) - committedOffset);

          kafkaConsumerLag.set(
            { topic, group_id: groupId, partition: String(partition) },
            lag,
          );
        }
      }
    } catch (err) {
      logger.warn(
        { err, groupId },
        "KafkaLagCollector: failed to fetch lag for group",
      );
    }
  }
}
