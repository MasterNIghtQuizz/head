import type { FastifyPluginAsync } from "fastify";
import type {
  Registry,
  Histogram,
  Counter,
  Gauge,
} from "prom-client";
import type { Kafka, Admin } from "kafkajs";

// ─── Registry ────────────────────────────────────────────────────────────────

export declare const registry: Registry;

// ─── HTTP metrics ─────────────────────────────────────────────────────────────

export declare const httpRequestDuration: Histogram<
  "method" | "route" | "status_code" | "service"
>;

export declare const httpRequestsTotal: Counter<
  "method" | "route" | "status_code" | "service"
>;

export declare const httpActiveRequests: Gauge<"service">;

export declare const serviceUp: Gauge<"service">;

export declare const serviceStartTimestamp: Gauge<"service">;

// ─── Kafka metrics ────────────────────────────────────────────────────────────

export declare const kafkaConsumerLag: Gauge<"topic" | "group_id" | "partition">;

export declare const kafkaMessagesConsumed: Counter<"topic" | "group_id">;

export declare const kafkaMessagesPublished: Counter<"topic">;

export interface ConsumerGroupConfig {
  groupId: string;
  topics: string[];
}

export declare class KafkaLagCollector {
  constructor(
    kafkaClient: Kafka,
    consumerGroups: ConsumerGroupConfig[],
    intervalMs?: number,
  );
  start(): void;
  stop(): void;
}

// ─── Fastify plugin ───────────────────────────────────────────────────────────

export interface MetricsPluginOptions {
  /** Name used as the `service` label on all metrics. */
  serviceName: string;
  /** Set to false to disable the plugin entirely (e.g. in test environments). */
  enabled?: boolean;
}

export declare function createMetricsPlugin(
  options: MetricsPluginOptions,
): FastifyPluginAsync;
