import { Kafka, KafkaConfig, ConsumerConfig, IHeaders } from "kafkajs";

export function createKafkaClient(config: KafkaConfig): Kafka;

export class KafkaProducer {
  constructor(kafkaClient: Kafka);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: any, headers?: IHeaders): Promise<void>;
}

export type MessageHandler = (
  payload: any,
  headers?: IHeaders,
) => Promise<void>;

export class KafkaConsumer {
  constructor(kafkaClient: Kafka, config: ConsumerConfig);
  addHandler(topic: string, handler: MessageHandler): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class KafkaAdmin {
  constructor(kafkaClient: Kafka);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ensureTopics(topics: string[]): Promise<void>;
}
